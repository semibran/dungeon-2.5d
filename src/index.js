// Changing this variable makes the calculation of the player's position go slightly off.
// Set it to 25 for the floor tiles (dots) to be perfectly lined up.
// Give it a go!
var tileScale = 4;

// Set seed to absolute value, or leave like this for randomness. Current seed in question is 5.444545969037558.
var seed = Math.random()*Math.random()*10;
console.log("The current generation has a seed of "+seed+".");

// This'll make all the tiles visible when set to true.
var visibility = false;
// Radiance triggers the radial gradient (get it?) kind of effect.
var radiance = true;

var costs = {};
costs.floor = 0;
costs.wall = 100;
costs.roomCell = 10;
costs.roomEdge = 200;
costs.roomCorner = 10000;
costs.marked = 5;
costs.digged = 50;

// Game object to supposedly reduce scope chains
function Game(){
	// Game reference for when the this keyword is out of scope
	var game = this;
	// Out of bounds function
	Array.prototype.outOfBounds = function(x, y){
		return x < 0 || y < 0 || x >= this[0].length || y >= this.length;
	}
	Array.prototype.copy = function(){
		var tempArray = [];
		for(var i = 0; i < this.length; i ++){
			tempArray.push(this[i]);
		}
		return tempArray;
	}
	Array.prototype.getIndex = function(x){
		for (var y in this) {
			if (this.hasOwnProperty(y) && this[y] === x) {
				return y;
			}
		}
		return -1;
	}
	Array.prototype.contains = function(x){
		return this.getIndex(x) !== -1;
	}
	Array.prototype.remove = function(x){
		var index = this.getIndex(x);
		if(index !== 1)this.splice(index, 1);
		else return false;
		return true;
	}
	var isEqual = function(x, y){
		return [x].contains(y);
	}
	this.RNG = function(seed){
		if(seed === undefined)Math.random();
		this.fixedSeed = seed;
		this.seed = seed;
		this.generate = function(){
			var x = Math.sin(this.seed++) * 10000;
			var y = x - Math.floor(x);
			return y;
		}
		this.generateInt = function(min, max){
			if(min === undefined){
				return this.generateInt(1) === 0;
			} else
			if(max === undefined){
				max = min;
				min = 0;
			}
			return Math.floor(this.generate()*(max-min))+min;
		}
	}
	this.rng = new this.RNG(seed);
	// Variable declarations
	this.map = [];
	// Note that if you change the map size here, you'll have to change the CSS, too (lines 46 and 47).
	this.mapSize = 25;
	this.roomsMin = 6;
	this.roomsMax = 7;
	this.roomRadiusMin = 1;
	this.roomRadiusMax = 3;
	this.largeRoomRadiusMin = 4;
	this.largeRoomRadiusMax = 6;
	this.largeRoomDecrement = 1;
	this.tileScale = tileScale;
	// Player circle of vision.
	this.playerVision = 7;
	this.elements = [];
	// Find pythagorean distance, with distance x and y values found
	this.pythagorean = function(dx, dy, sqrt){
		if(sqrt === undefined || sqrt)return Math.sqrt(dx*dx+dy*dy);
		else return dx*dx+dy*dy;
	}
	// Function for attaching elements to the screen
	this.createElement = function(type, parent, properties){
		properties = properties || {};
		var element = document.createElement(type);
		for(var i in properties)element[i] = properties[i];
		parent.appendChild(element);
		return element;
	}
	this.removeElementTransition = function(element, func, args){
		if(args === undefined)args = [];
		element.classList.add("no-transition");
		func.apply(game, args);
		element.offsetHeight;
		element.classList.remove("no-transition");
	}
	// Function that executes when the browser resizes.
	window.onresize = this.resizeViewport = function(initial){
		var i, j, entry;
		// Get size of game area (inner square)
		game.viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		game.viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		game.windowSize = Math.min(game.viewportWidth, game.viewportHeight);
		// Droid Sans Mono has a ratio of 3:4 (width:height), conveniently.
		game.tileWidth = game.windowSize*.6 / game.tileScale;
		game.tileHeight = game.windowSize*.8 / game.tileScale;

		game.log.div.style.width = game.windowSize+"px";
		game.log.div.style.height = game.windowSize/5.25+"px";

		for(i = 0; i < game.log.elements.length; i ++){
			entry = game.log.elements[i];
			entry.style.fontSize = game.windowSize/40+"px";
			entry.style.top = (i*game.windowSize/40+game.windowSize/256)+"px";
		}

		game.container.style.width = game.container.style.height = game.windowSize+"px";

		game.plane.style.width = game.tileWidth*game.mapSize+"px";
		game.plane.style.height = game.tileHeight*game.mapSize+"px";
		// game.container.style.transform = "rotateX("+Math.round(45+(768-game.windowSize)/16)+"deg)";
		// The first call to this function is at a point where these functions are not defined.
		if(initial !== true){
			/*console.log("Starting first loop")
			for(i = 0; i < game.map.length; i ++){
				for(j = 0; j < game.map[i].length; j ++){
					game.removeElementTransition(game.map[i][j].tile, game.updateItem, [game.map[i][j]]);
				}
			}*/
			game.updateList(game.tiles);
			for(i = 0; i < game.elements.length; i ++)game.removeElementTransition(game.elements[i].element, game.updateItem, [game.elements[i]]);
			game.removeElementTransition(game.planeContainer, game.updateCamera);
		}
	}
	// Create container (main square)
	this.container = this.createElement("div", document.body, {
		id: "container",
		className: "absolute-center",
	});
	// Create plane on which the visible map rests (is rotated 45 degrees, see CSS)
	this.plane = this.createElement("div", this.container, {
		id: "plane",
	});
	this.Log = function(){
		this.entries = [];
		this.elements = [];
		this.div = game.createElement("div", game.container, {className: "log"});
		this.div.style.width = game.windowSize+"px";
		this.div.style.height = game.windowSize/6+"px";
		this.ul = game.createElement("ul", this.div);
		this.print = function(message){
			var entry, i, li, interval;
			if(this.entries[0] !== message){
				this.entries.unshift(message);
				li = game.createElement("li", this.ul);
				li.style.top = "0";
				li.style.fontSize = game.windowSize/40+"px";
				li.index = 0;
				li.repeats = 1;
				li.extra = "";
				li.drawing = true;
				interval = setInterval(function(){
					li.innerHTML += message[li.index];
					if(++li.index >= message.length){
						li.drawing = false;
						clearInterval(interval);
					}
				}, 20);
				this.elements.unshift(li);
				for(i = 0; i < this.elements.length; i ++){
					entry = this.elements[i];
					entry.style.top = (i*game.windowSize/40+game.windowSize/256)+"px";
					if(i >= 7){
						entry.style.opacity = 0;
					}
				}
			} else {
				li = this.elements[0];
				if(!li.drawing){
					li.index = 0;
					li.repeats ++;
					if(li.repeats === 2){
						li.extra = " (x"+li.repeats+")";
						interval = setInterval(function(){
							li.innerHTML += li.extra[li.index];
							if(++li.index >= li.extra.length)clearInterval(interval);
						}, 20);
					} else {
						li.innerHTML = li.innerHTML.slice(0, li.innerHTML.length-li.extra.length);
						li.extra = " (x"+li.repeats+")";
						if(li.repeats > 100)li.extra = " (x100+)";
						li.innerHTML += li.extra;
					}
				}
			}
		}
	}
	this.log = new this.Log();
	this.log.print("Change the screen size to reduce lag.");
	this.log.print("Descend staircases with '.'.");
	this.log.print("You can interact with doors using 'C' and 'O'.");
	this.log.print("Move with the arrow keys or ykuhlbjn.");
	this.resizeViewport(true);
	// Change hex value to RGB (in format of e.g. FFFFFF, without #)
	this.toRGB = function(triplet){
		var color = {};
		var sequence = ["red", "green", "blue"];
		var segment;
		var index = 0;
		for(var i = 0; i < triplet.length; i += 2){
			segment = triplet[i]+triplet[i+1];
			color[sequence[index]] = parseInt("0x"+segment);
			index ++;
		}
		return color;
	}
	this.Pathfinder = function(){
		var openList = [],
			closedList = [],
			mapStatus = [],
			path = [],
		cheapest = function(){
			return openList.sort(function(a, b){
				return a.f-b.f;
			})[0];
		},
		open = function(cell){
			if(openList.contains(cell))return;
			openList.push(cell);
			mapStatus[cell.y][cell.x].open = true;
		},
		close = function(cell){
			closedList.push(cell);
			mapStatus[cell.y][cell.x].open = false;
			mapStatus[cell.y][cell.x].closed = true;
			openList.remove(cell);
		}
		this.costs = {};
		for(var cost in costs)this.costs[cost] = costs[cost];
		this.manhattan = function(a, b){
			return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
		}
		this.calculate = function(start, end, map, diagonals, maze){
			if(diagonals === undefined)diagonals = true;
			if(maze === undefined)maze = false;
			var i, j, t, x, y, g, manhattan, cell, cellStatus, newCell, newCellStatus, cost, walkable;
			for(i = 0; i < map.length; i ++){
				mapStatus[i] = [];
				for(j = 0; j < map[i].length; j ++){
					t = map[i][j];
					if(maze){
						cost = this.costs.wall;
						if(t.marked)cost = this.costs.marked;
						if(t.roomCell)cost = this.costs.roomCell;
						if(t.roomEdge)cost = this.costs.roomEdge;
						if(t.roomCorner)cost = this.costs.roomCorner;
						if(t.digged)cost = this.costs.digged;
						walkable = i > 0 && j > 0 && i < map.length-1 && j < map[i].length-1;
					} else {
						walkable = true;
						if(t.char === "#")walkable = false;
						cost = game.tileTypes[t.char].cost;
					}
					cell = {};
					cell.open = false;
					cell.closed = false;
					cell.x = j;
					cell.y = i;
					cell.g = Infinity;
					cell.h = this.manhattan({x: i, y: j}, end);
					cell.f = cell.g + cell.h;
					cell.parent = null;
					cell.cost = cost;
					cell.walkable = walkable;
					mapStatus[i][j] = cell;
				}
			}
			path = [];
			cell = mapStatus[start.y][start.x];
			cell.g = 0;
			openList = [cell];
			var loops = 0;
			while(openList.length > 0){
				cell = cheapest();
				close(cell);
				if(cell.x === end.x && cell.y === end.y)break;
				for(y = cell.y-1; y <= cell.y+1; y ++){
					for(x = cell.x-1; x <= cell.x+1; x ++){
						newCell = {x: x, y: y};
						manhattan = this.manhattan(cell, newCell);
						if((manhattan === 1 || diagonals) && cell.walkable && !map.outOfBounds(x, y) && !mapStatus[y][x].closed){
							cellStatus = mapStatus[cell.y][cell.x];
							newCellStatus = mapStatus[y][x];
							g = cellStatus.g + manhattan + newCellStatus.cost;
							if(!newCellStatus.open || g <= newCellStatus.g){
								mapStatus[y][x].g = g;
								mapStatus[y][x].f = g + this.manhattan(newCell, end);
								mapStatus[y][x].parent = cell;
								open(newCellStatus);
							}
						}
					}
				}
				loops ++;
			}
			if(mapStatus[end.y][end.x].closed){
				cell = mapStatus[end.y][end.x];
				while(!(cell.x === start.x && cell.y === start.y)){
					cell = cell.parent;
					path.push({x: cell.x, y: cell.y});
				}
				return path.reverse();
			} else {
				return [];
			}
		}
	}
	this.pathfinder = new this.Pathfinder();
	this.Rectangle = function(left, top, right, bottom){
		this.left = left;
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.intersect = function(rect){
			return this.left < rect.right && this.right > rect.left && this.top < rect.bottom && this.bottom > rect.top;
		}
		this.intersectPoint = function(x, y){
			if(y === undefined){
				y = x.y;
				x = x.x;
			}
			return x > this.left && x < this.right && y > this.top && y < this.bottom;
		}
		this.contains = function(rect){
			var a = {x: rect.left, y: rect.top};
			var b = {x: rect.right, y: rect.bottom};
			return this.intersectPoint(a) && this.intersectPoint(b);
		}
	}
	this.Room = function(){
		var i, j, x, y, r, c, t, widthRadius, heightRadius, width, height, rectangle, room, valid, intersect, inside = false, failed, iters = 0, itersMax = 256;
		this.children = [];
		this.make = function(){
			while(!valid){
				if(game.rng.generateInt(4) === 0)this.type = "large";
				else this.type = "normal";
				if(this.type === "large"){
					widthRadius = game.rng.generateInt(game.largeRoomRadiusMin, game.largeRoomRadiusMax+1);
					heightRadius = game.rng.generateInt(game.largeRoomRadiusMin, game.largeRoomRadiusMax+1);
				} else if(this.type === "normal"){
					widthRadius = game.rng.generateInt(game.roomRadiusMin, game.roomRadiusMax+1);
					heightRadius = game.rng.generateInt(game.roomRadiusMin, game.roomRadiusMax+1);
				}
				width = widthRadius*2+1;
				height = heightRadius*2+1;
				x = game.rng.generateInt((game.mapSize-width-2)/2)*2+1;
				y = game.rng.generateInt((game.mapSize-height-2)/2)*2+1;
				rectangle = new game.Rectangle(x, y, x+width-1, y+height-1);
				this.rectangle = rectangle;
				valid = (function(){
					for(i = 0; i < game.rooms.length; i ++){
						room = game.rooms[i];
						r = room.rectangle;
						intersect = new game.Rectangle(x-1, y-1, x+width+1, y+height+1).intersect(new game.Rectangle(r.left-1, r.top-1, r.right+1, r.bottom+1));
						if(!inside)inside = this.type !== "large" && r.contains(rectangle);
						if(inside){
							for(j = 0; j < room.children.length; j ++){
								c = room.children[j].rectangle;
								if(new game.Rectangle(x-1, y-1, x+width+1, y+height+1).intersect(new game.Rectangle(c.left-1, c.top-1, c.right+1, c.bottom+1))){
									return false;
								}
							}
							room.children.push(this);
						} else if(intersect){
							return false;
						}
					}
					return true;
				}).apply(this);
				this.widthRadius = widthRadius;
				this.heightRadius = heightRadius;
				this.inside = inside;
				if(iters >= itersMax){
					failed = true;
					break;
				}
				iters ++;
			}
			if(failed)return false;
			this.rectangle = rectangle;
			this.center = {x: x+widthRadius, y: y+heightRadius};
			this.edges = [];
			this.trueEdges = [];
			this.border = [];
			for(i = rectangle.top; i <= rectangle.bottom; i ++){
				if(i > rectangle.top && i < rectangle.bottom){
					this.edges.push({x: rectangle.left-1, y: i}, {x: rectangle.right+1, y: i});
				}
				this.trueEdges.push({x: rectangle.left-1, y: i}, {x: rectangle.right+1, y: i});
			}
			for(i = rectangle.left; i <= rectangle.right; i ++){
				if(i > rectangle.left && i < rectangle.right){
					this.edges.push({x: i, y: rectangle.top-1}, {x: i, y: rectangle.bottom+1});
				}
				this.trueEdges.push({x: i, y: rectangle.top-1}, {x: i, y: rectangle.bottom+1});
			}
			this.border.push(
				{x: rectangle.left-1, y: rectangle.top-1},
				{x: rectangle.right+1, y: rectangle.top-1},
				{x: rectangle.left-1, y: rectangle.bottom+1},
				{x: rectangle.right+1, y: rectangle.bottom+1}
			);
			for(i = 0; i < this.border.length; i ++){
				t = this.border[i];
				game.map[t.y][t.x].roomCorner = true;
			}
			for(i = 0; i < this.trueEdges.length; i ++)this.border.push(this.trueEdges[i]);
			if(inside){
				for(i = 0; i < this.border.length; i ++){
					t = this.border[i];
					game.map[t.y][t.x].color = "#ff0000";
					game.map[t.y][t.x].insideEdge = true;
				}
			}
			for(var i = 0; i < this.trueEdges.length; i ++){
				t = this.trueEdges[i];
				game.map[t.y][t.x].roomEdge = true;
			}
			game.rooms.push(this);
			return true;
		}
		this.mark = function(){
			if(!this.inside){
				var i, j;
				for(i = this.rectangle.top; i <= this.rectangle.bottom; i ++){
					for(j = this.rectangle.left; j <= this.rectangle.right; j ++){
						if(!game.marked.contains({x: j, y: i}))game.marked.push({x: j, y: i});
						game.map[i][j].marked = true;
						game.map[i][j].roomCell = true;
					}
				}
			}
			game.rooms.push(this);
		}
	}
	// Tile class for items bound to the grid (like walls, doors, and floors)
	this.Tile = function(x, y, char){
		this.x = x;
		this.y = y;
		this.char = char;
		this.color = game.tileTypes[this.char].color;
		this.solid = game.tileTypes[this.char].solid;
		this.opaque = game.tileTypes[this.char].opaque;
		this.visible = false;
		this.visited = false;
		this.roomCell = false;
		this.roomEdge = false;
		this.roomCorner = false;
		this.insideEdge = false;
		this.insidePath = false;
		this.marked = false;
		this.digged = false;
		// Create tile div in the tile container
		this.tile = game.createElement("div", game.tileContainer, {
			className: game.tileTypes[this.char].className,
		});
		// Create tile text (centered within containing div)
		this.text = game.createElement("div", this.tile, {
			className: "inner-text",
			innerHTML: char,
		});
		this.change = function(newChar){
			this.char = newChar;
			this.color = game.tileTypes[this.char].color;
			this.solid = game.tileTypes[this.char].solid;
			this.opaque = game.tileTypes[this.char].opaque;
			this.text.innerHTML = this.char;
		}
		this.reset = function(){
			this.visible = false;
			this.visited = false;
			this.marked = false;
			this.digged = false;
			this.roomEdge = false;
			this.roomCorner = false;
			this.roomCell = false;
			this.insideEdge = false;
			this.insidePath = false;
		}
	}
	// Element class for items not bound to the grid (such as the player, enemies, and items)
	this.Element = function(x, y, char, color, classes){
		classes = classes || "";
		this.x = x;
		this.y = y;
		this.char = char;
		this.color = color;
		this.classes = classes;
		this.type = "element";
		// Create onscreen representation
		this.element = game.createElement("div", game.elementContainer, {
			className: classes+" element",
		});
		// Create symbol identification (e.g. "@")
		this.text = game.createElement("div", this.element, {
			className: "inner-text",
			innerHTML: this.char,
		});
		// Add to list of game elements
		game.elements.push(this);
	}
	// Player class
	this.Player = function(x, y){
		var root = this.root = new game.Element(x, y, "@", "#ffffff", "player");
		root.vision = game.playerVision;
		root.visible = true;
		root.visibleTiles = [];
		// Move function
		root.move = function(dx, dy){
			// Get new coordinates
			var tx = root.x+dx;
			var ty = root.y+dy;
			// If tile at destination is walkable:
			if(!game.map.outOfBounds(tx, ty) && !game.tileTypes[game.map[ty][tx].char].solid){
				// Set position to destination
				root.x = tx;
				root.y = ty;
				if(game.map[root.y][root.x].char === ">")game.log.print("There's a staircase going down here.");
				// Raycast at new position
				root.raycast();
			} else {
				if(game.map[ty][tx].char === "+"){
					game.log.print("You open the door.");
					game.map[ty][tx].change("/");
					root.raycast();
				}
			}
			// Align the player and the camera
			game.updateList(game.elements);
			game.updateCamera();
		}
		// Raycasting function
		root.raycast = function(){
			if(visibility){
				return;
			} else {
				var i,
					angle,
					tile,
					radians,
					x,
					y,
					cos,
					sin;
				// Darken all previously lit tiles
				for(i = 0; i < root.visibleTiles.length; i ++){
					root.visibleTiles[i].visible = false;
					game.updateItem(root.visibleTiles[i]);
				}
				// Clear list of visible tiles
				root.visibleTiles = [];
				root.visibleTiles.length = 0;
				// Illuminate current tile (so we can see the player)
				root.illuminate(root.x, root.y);
				// Main loop; decrease angle increment for accuracy, increase for speed
				for(angle = 0; angle < 360; angle += 3){
					// Get radians from current angle
					radians = angle*Math.PI/180;
					// Save trigonometrical values beforehand
					cos = Math.cos(radians);
					sin = Math.sin(radians);
					// Extend ray outwards; i = 1 so player is not included
					for(i = 1; i < root.vision; i ++){
						// Get rounded coordinates of ray
						x = Math.round(root.x+cos*i);
						y = Math.round(root.y+sin*i);
						// If tile is out of bounds or tile type is opaque, break out of the loop
						if(game.map.outOfBounds(x, y) || game.tileTypes[root.illuminate(x, y).char].opaque)break;
					}
				}
			}
		}
		// Function for illuminating a tile
		root.illuminate = function(x, y){
			var tile = game.map[y][x];
			// Set tile visibility to true
			tile.visible = true;
			// The tile has been visited.
			tile.visited = true;
			// Add tile to visibleTiles list
			root.visibleTiles.push(tile);
			// Recolor the tile to indicate visibility
			game.updateItem(tile);
			// Return the illuminated tile
			return tile;
		}
		root.openDoors = function(){
			var i, j, opens = 0;
			for(i = root.y-1; i <= root.y+1; i ++){
				for(j = root.x-1; j <= root.x+1; j ++){
					if(!(j === root.x && i === root.y) && game.map[i][j].char === "+"){
						game.map[i][j].change("/");
						opens ++;
					}
				}
			}
			if(opens > 0){
				if(opens === 1)game.log.print("You cautiously open a door.");
				else game.log.print("You cautiously open some doors.");
				root.raycast();
			} else game.log.print("There's no doors to open!");
			return opens > 0;
		}
		root.closeDoors = function(){
			var i, j, closes = 0;
			for(i = root.y-1; i <= root.y+1; i ++){
				for(j = root.x-1; j <= root.x+1; j ++){
					if(!(j === root.x && i === root.y) && game.map[i][j].char === "/"){
						game.map[i][j].change("+");
						closes ++;
					}
				}
			}
			if(closes > 0){
				if(closes === 1)game.log.print("You cautiously close a door.");
				else game.log.print("You cautiously close some doors.");
				root.raycast();
			} else game.log.print("There's no doors to close!");
			return closes > 0;
		}
		root.descend = function(){
			if(game.map[root.y][root.x].char === ">"){
				game.log.print("You descend the staircase. It crumbles under your weight!");
				game.generate();
			} else game.log.print("You can't go down here!");
		}
	}
	// Game start function
	var i;
	var j;
	// Colors, class names, and other properties for each tile type
	this.tileTypes = {
		"#": {
			className: "tile wall",
			color: "#2F4F4F",
			solid: true,
			opaque: true,
			cost: 1e7
		},
		"+": {
			className: "tile",
			color: "#A52A2A",
			solid: true,
			opaque: true,
			cost: 5
		},
		"/": {
			className: "tile",
			color: "#A52A2A",
			solid: false,
			opaque: false,
			cost: 0
		},
		"&middot;": {
			className: "tile floor",
			color: "#808000",
			solid: false,
			opaque: false,
			cost: 0
		},
		"@": {
			className: "tile player",
			color: "#ffffff",
			solid: false,
			opaque: false
		},
		">": {
			className: "tile",
			color: "#ffffff",
			solid: false,
			opaque: false,
			cost: 0
		},
	};
	this.tiles = [];
	// Function for repositioning and recoloring a tile
	this.updateItem = function(item){
		// The item may be a tile or an element not bound to the grid
		var tile = item.tile || item.element;
		// Move the tile to position based on tile size values
		tile.style.left = game.tileWidth*item.x+"px";
		tile.style.top = game.tileHeight*item.y+"px";
		// Change font size based on window size
		tile.style.fontSize = (game.windowSize/game.tileScale)+"px";
		// Change depth to new value
		tile.style.zIndex = game.map.length*game.map[item.y].length-(item.y*game.map.length+item.x);
		if(item.type === "element")tile.style.zIndex *= 100;
		// If a tile is under an element, set its opacity to 0% - if not, leave it at 100%
		if(game.player !== undefined && item.type !== "element" && game.player.x === item.x && game.player.y === item.y){
			tile.style.opacity = "0";
		} else tile.style.opacity = "1";
		// If the item is invisible, set its color to black
		if(visibility){
			tile.style.color = item.color;
		} else if(item.visible){
			if(radiance){
				// Color the tile based on distance from the player
				var dist = game.pythagorean(item.x-game.player.x, item.y-game.player.y),
					oldColor = item.color.slice(1, item.color.length),
					oldRgbColor = game.toRGB(oldColor),
					rgbColor = oldRgbColor,
					newColor = "#",
					sequence = ["red", "green", "blue"],
					percent = 1-dist/game.player.vision;
				if(percent > 1)percent = 1;
				if(percent < 0)percent = 0;
				for(var i = 0; i < sequence.length; i ++){
					rgbColor[sequence[i]] *= percent;
					rgbColor[sequence[i]] = Math.round(rgbColor[sequence[i]]).toString(16);
					if(rgbColor[sequence[i]].length < 2){
						rgbColor[sequence[i]] = "0"+rgbColor[sequence[i]];
					}
					newColor += rgbColor[sequence[i]];
				}
				// Set the new color value
				tile.style.color = newColor;
			} else {
				tile.style.color = item.color;
			}
		} else if(item.visited)tile.style.color = "#060606";
		else {
			tile.style.color = "#000";
		}
	}
	// Update a list of tiles/elements
	this.updateList = function(list){
		for(var i = 0; i < list.length; i ++)game.updateItem(list[i]);
	}
	// Update the camera position (needs help?)
	this.updateCamera = function(){
		// Get player coordinates (-.5 because we need to get the player tile center)
		// times the tileWidth plus the game window (inner square) size divided by two.
		var left = ((-game.player.x-.5)*game.tileWidth+game.windowSize/2)+"px";
		var top = ((-game.player.y-.5)*game.tileHeight-game.windowSize/2)+"px";
		game.planeContainer.style.left = left;
		game.planeContainer.style.top = top;
	}
	// Create the plane container for the camera
	this.planeContainer = this.createElement("div", this.plane, {
		className: "plane-container",
		id: "plane-container",
	});
	// Create a container for the tiles (for depth separation)
	this.tileContainer = this.createElement("div", this.planeContainer, {
		className: "plane-container",
		id: "tile-container",
	});
	// Create a container for the elements (for depth separation)
	this.elementContainer = this.createElement("div", this.planeContainer, {
		className: "plane-container",
		id: "element-container",
	});
	this.tileContainer.style.zIndex = "0";
	this.elementContainer.style.zIndex = "1";
	// Map generation function
	this.makeTiles = function(){
		for(i = 0; i < this.mapSize; i ++){
			this.map[i] = [];
			for(j = 0; j < this.mapSize; j ++){
				this.map[i][j] = new this.Tile(j, i, "#");
				// Add to tile list
				this.tiles.push(this.map[i][j]);
			}
		}
	}
	this.rooms = [];
	this.marked = [];
	this.generate = function(){
		var i,
			j,
			k,
			t,
			a,
			b,
			e,
			x,
			y,
			wasMarked,
			noDoors,
			char,
			start,
			cell,
			newX,
			newY,
			newCell,
			stack,
			valid,
			direction,
			directions,
			index,
			room,
			rooms = this.rng.generateInt(this.roomsMin, this.roomsMax+1),
			step = 2,
			unconnected,
			indexes,
			connections,
			path,
			color,
			center,
			centers,
			extraConnections = 0,
			extraConnectionsMax = 8;
		for(i = 0; i < this.mapSize; i ++){
			for(j = 0; j < this.mapSize; j ++){
				this.map[i][j].change("#");
				this.map[i][j].reset();
			}
		}
		this.rooms = [];
		this.marked = [];
		start = {
			x: this.rng.generateInt((this.mapSize-1)/step)*step+1,
			y: this.rng.generateInt((this.mapSize-1)/step)*step+1,
		};
		cell = start;
		stack = [start];
		while(stack.length > 0){
			valid = false;
			directions = [
				{x:-1, y: 0},
				{x: 1, y: 0},
				{x: 0, y:-1},
				{x: 0, y: 1},
			];
			while(!valid && directions.length > 0){
				index = this.rng.generateInt(directions.length);
				direction = directions[index];
				directions.splice(index, 1);
				newX = step*direction.x+cell.x;
				newY = step*direction.y+cell.y;
				newCell = {x: newX, y: newY};
				valid = !this.map.outOfBounds(newX, newY) && (!this.map[newY][newX].marked || this.rng.generateInt(128) === 0);
			}
			if(valid){
				wasMarked = this.map[newY][newX].marked;
				for(i = 0; i <= step; i ++){
					newX = i*direction.x+cell.x;
					newY = i*direction.y+cell.y;
					if(!this.map.outOfBounds(newX, newY)){
/*						this.map[newY][newX].change("&middot;");
						this.map[newY][newX].color = "green";*/
 						// this.marked.push({x: newX, y: newY});
						this.map[newY][newX].marked = true;
					}
				}
				if(!wasMarked){
					stack.push(newCell);
					cell = newCell;
				} else {
					cell = stack.pop();
				}
			} else {
				cell = stack.pop();
			}
		}
		valid = false;
		while(!valid){
			for(i = 0; i < rooms; i ++){
				room = new this.Room();
				if(!room.make()){
					return this.generate();
					break;
				}
				room.mark();
				if(room.type === "large")i += game.largeRoomDecrement;
				if(i === rooms-1)valid = true;
			}
		}
		unconnected = this.rooms.copy();
		indexes = [];
		connections = [];
		i = unconnected.length;
		while(i --)indexes.push(false);
		while(connections.length < unconnected.length || extraConnections < extraConnectionsMax){
			i = j = undefined;
			if(connections.length < unconnected.length){
				while(i === undefined || indexes[i])i = this.rng.generateInt(unconnected.length);
				a = unconnected[i];
				while(j === undefined || isEqual(this.rooms[j], a))j = this.rng.generateInt(this.rooms.length);
				b = this.rooms[j];
				indexes[i] = true;
				connections.push(a);
			} else {
				while(i === j){
					i = this.rng.generateInt(this.rooms.length);
					j = this.rng.generateInt(this.rooms.length);
				}
				extraConnections ++;
			}

			path = this.pathfinder.calculate(a.center, b.center, this.map, false, true);
			if(path.length > 0){
				for(k = 0; k < path.length; k ++){
					t = path[k];
					if(this.rooms[this.rooms.getIndex(a)].inside){
						this.map[t.y][t.x].insidePath = true;
					}
					if(!this.marked.contains(t))this.marked.push(t);
					this.map[t.y][t.x].digged = true;
				}
			}
		}
		for(i = 0; i < this.marked.length; i ++){
			cell = this.marked[i];
			if(!this.map[cell.y][cell.x].insideEdge || this.map[cell.y][cell.x].insidePath){
				// color = this.map[cell.y][cell.x].color;
				this.map[cell.y][cell.x].change("&middot;");
				// this.map[cell.y][cell.x].color = color;
			}
		}
		room = this.rooms[this.rng.generateInt(this.rooms.length)];
		centers = [];
		for(i = 0; i < this.rooms.length; i ++){
			centers[i] = {steps: this.pathfinder.calculate(this.rooms[i].center, room.center, this.map).length, obj: this.rooms[i].center};
		}

		centers.sort(function(a, b){return b.steps-a.steps});
		center = centers[0].obj;
 		this.map[center.y][center.x].change(">");
		x = room.center.x+this.rng.generateInt(-room.widthRadius, room.widthRadius+1);
		y = room.center.y+this.rng.generateInt(-room.heightRadius, room.heightRadius+1);
		if(!this.player)this.player = new this.Player(x, y).root;
		else {
			this.player.x = x;
			this.player.y = y;
		}
		for(i = 0; i < this.rooms.length; i ++){
			room = this.rooms[i];
			for(j = 0; j < room.trueEdges.length; j ++){
				e = room.trueEdges[j];
				if(this.map[e.y][e.x].char === "&middot;"){
					noDoors = true;
					for(var k = e.y-1; k <= e.y+1; k ++){
						for(var l = e.x-1; l <= e.x+1; l ++){
							if(this.pathfinder.manhattan({x: l, y: k}, e) === 1 && this.map[k][l].char === "+"){
								noDoors = false;
								break;
							}
						}
						if(!noDoors)break;
					}
					if(noDoors)this.map[e.y][e.x].change("+");
				}
			}
		}

/*		var mapRep = [];
		for(i = 0; i < this.map.length; i ++){
			mapRep[i] = "";
			for(j = 0; j < this.map[i].length; j ++){
				char = this.map[i][j].char;
				if(char === "&middot;")char = ".";
				mapRep[i] += char;
			}
			console.log(mapRep[i]+" <- "+i);
		}*/
		game.removeElementTransition(game.player.element, game.updateItem, [game.player]);
		if(!visibility)this.player.raycast();
		for(i = 0; i < this.map.length; i ++){
			for(j = 0; j < this.map[i].length; j ++){
				game.removeElementTransition(game.map[i][j].tile, game.updateItem, [game.map[i][j]]);
			}
		}
		game.removeElementTransition(game.planeContainer, game.updateCamera);
		return true;
	}
	// Call the generation function
	this.makeTiles();
	this.generate();
	// Update everything!
	this.updateList(this.tiles);
	this.updateItem(this.player);
	this.updateCamera();
	// Key input
	this.keyDown = function(e) {
		switch(e.keyCode){
			case 37:
				game.player.move(-1, 0);
				break;
			case 39:
				game.player.move( 1, 0);
				break;
			case 38:
				game.player.move( 0,-1);
				break;
			case 40:
				game.player.move( 0, 1);
				break;

			case 89:
				game.player.move(-1,-1);
				break;
			case 75:
				game.player.move( 0,-1);
				break;
			case 85:
				game.player.move( 1,-1);
				break;
			case 72:
				game.player.move(-1, 0);
				break;
			case 76:
				game.player.move( 1, 0);
				break;
			case 66:
				game.player.move(-1, 1);
				break;
			case 74:
				game.player.move( 0, 1);
				break;
			case 78:
				game.player.move( 1, 1);
				break;

			case 79:
				game.player.openDoors();
				break;
			case 67:
				game.player.closeDoors();
				break;
			case 190:
				game.player.descend();
				break;
		}
	};
	this.keyUp = function(e) {};
	document.onkeydown = this.keyDown;
	document.onkeyup = this.keyUp;
}
var game = new Game();
