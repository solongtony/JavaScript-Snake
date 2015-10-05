/**
* This class manages the snake which will reside inside of a SNAKE.Board object.
* @class Snake
* @constructor
* @namespace SNAKE
* @param {Object} config The configuration object for the class. Contains playingBoard (the SNAKE.Board that this snake resides in), startRow and startCol.
*/
SNAKE.Snake = SNAKE.Snake || (function() {

    // -------------------------------------------------------------------------
    // Private static variables and methods
    // -------------------------------------------------------------------------

    var instanceNumber = 0;
    var blockPool = [];

    var SnakeBlock = function() {
        this.elm = null;
        this.elmStyle = null;
        this.row = -1;
        this.col = -1;
        this.xPos = -1000;
        this.yPos = -1000;
        this.next = null;
        this.prev = null;
    };

    // this function is adapted from the example at http://greengeckodesign.com/blog/2007/07/get-highest-z-index-in-javascript.html
    function getNextHighestZIndex(myObj) {
        var highestIndex = 0,
            currentIndex = 0,
            ii;
        for (ii in myObj) {
            if (myObj[ii].elm.currentStyle){
                currentIndex = parseFloat(myObj[ii].elm.style["z-index"],10);
            }else if(window.getComputedStyle) {
                currentIndex = parseFloat(document.defaultView.getComputedStyle(myObj[ii].elm,null).getPropertyValue("z-index"),10);
            }
            if(!isNaN(currentIndex) && currentIndex > highestIndex){
                highestIndex = currentIndex;
            }
        }
        return(highestIndex+1);
    }

    // -------------------------------------------------------------------------
    // Contructor + public and private definitions
    // -------------------------------------------------------------------------

    /*
        config options:
            playingBoard - the SnakeBoard that this snake belongs too.
            startRow - The row the snake should start on.
            startCol - The column the snake should start on.
    */
    return function(config) {

        if (!config||!config.playingBoard) {return;}

        // ----- private variables -----

        var me = this,
            playingBoard = config.playingBoard,
            myId = instanceNumber++,
            growthIncr = 5,
            moveQueue = [], // a queue that holds the next moves of the snake
            currentDirection = 1, // 0: up, 1: left, 2: down, 3: right
            columnShift = [0, 1, 0, -1],
            rowShift = [-1, 0, 1, 0],
            xPosShift = [],
            yPosShift = [],
            snakeSpeed = 75,
            isDead = false,
            isPaused = false;

        // ----- public variables -----

        me.snakeBody = {};
        me.snakeBody["b0"] = new SnakeBlock(); // create snake head
        me.snakeBody["b0"].row = config.startRow || 1;
        me.snakeBody["b0"].col = config.startCol || 1;
        me.snakeBody["b0"].xPos = me.snakeBody["b0"].row * playingBoard.getBlockWidth();
        me.snakeBody["b0"].yPos = me.snakeBody["b0"].col * playingBoard.getBlockHeight();
        me.snakeBody["b0"].elm = createSnakeElement();
        me.snakeBody["b0"].elmStyle = me.snakeBody["b0"].elm.style;
        playingBoard.getBoardContainer().appendChild( me.snakeBody["b0"].elm );
        me.snakeBody["b0"].elm.style.left = me.snakeBody["b0"].xPos + "px";
        me.snakeBody["b0"].elm.style.top = me.snakeBody["b0"].yPos + "px";
        me.snakeBody["b0"].next = me.snakeBody["b0"];
        me.snakeBody["b0"].prev = me.snakeBody["b0"];

        me.snakeLength = 1;
        me.snakeHead = me.snakeBody["b0"];
        me.snakeTail = me.snakeBody["b0"];
        me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'');
        me.snakeHead.elm.className += " snake-snakebody-alive";

        // ----- private methods -----

        function createSnakeElement() {
            var tempNode = document.createElement("div");
            tempNode.className = "snake-snakebody-block";
            tempNode.style.left = "-1000px";
            tempNode.style.top = "-1000px";
            tempNode.style.width = playingBoard.getBlockWidth() + "px";
            tempNode.style.height = playingBoard.getBlockHeight() + "px";
            return tempNode;
        }

        function createBlocks(num) {
            var tempBlock;
            var tempNode = createSnakeElement();

            for (var ii = 1; ii < num; ii++){
                tempBlock = new SnakeBlock();
                tempBlock.elm = tempNode.cloneNode(true);
                tempBlock.elmStyle = tempBlock.elm.style;
                playingBoard.getBoardContainer().appendChild( tempBlock.elm );
                blockPool[blockPool.length] = tempBlock;
            }

            tempBlock = new SnakeBlock();
            tempBlock.elm = tempNode;
            playingBoard.getBoardContainer().appendChild( tempBlock.elm );
            blockPool[blockPool.length] = tempBlock;
        }

        // ----- public methods -----

        me.setPaused = function(val) {
            isPaused = val;
        };
        me.getPaused = function() {
            return isPaused;
        };

        /**
        * This method is called when a user presses a key. It logs arrow key presses in "moveQueue", which is used when the snake needs to make its next move.
        * @method handleArrowKeys
        * @param {Number} keyNum A number representing the key that was pressed.
        */
        /*
            Handles what happens when an arrow key is pressed.
            Direction explained (0 = up, etc etc)
                    0
                  3   1
                    2
        */
        me.handleArrowKeys = function(keyNum) {
            if (isDead || isPaused) {return;}

            var snakeLength = me.snakeLength;
            var lastMove = moveQueue[0] || currentDirection;

            //console.log("lastmove="+lastMove);
            //console.log("dir="+keyNum);

            switch (keyNum) {
                case 37:
                case 65:
                    if ( lastMove !== 1 || snakeLength === 1 ) {
                        moveQueue.unshift(3); //SnakeDirection = 3;
                    }
                    break;
                case 38:
                case 87:
                    if ( lastMove !== 2 || snakeLength === 1 ) {
                        moveQueue.unshift(0);//SnakeDirection = 0;
                    }
                    break;
                case 39:
                case 68:
                    if ( lastMove !== 3 || snakeLength === 1 ) {
                        moveQueue.unshift(1); //SnakeDirection = 1;
                    }
                    break;
                case 40:
                case 83:
                    if ( lastMove !== 0 || snakeLength === 1 ) {
                        moveQueue.unshift(2);//SnakeDirection = 2;
                    }
                    break;
            }
        };

        /**
        * This method is executed for each move of the snake. It determines where the snake will go and what will happen to it. This method needs to run quickly.
        * @method go
        */
        me.go = function() {

            var oldHead = me.snakeHead,
                newHead = me.snakeTail,
                myDirection = currentDirection,
                grid = playingBoard.grid; // cache grid for quicker lookup

            if (isPaused === true) {
                setTimeout(function(){me.go();}, snakeSpeed);
                return;
            }

            me.snakeTail = newHead.prev;
            me.snakeHead = newHead;

            // clear the old board position
            if ( grid[newHead.row] && grid[newHead.row][newHead.col] ) {
                grid[newHead.row][newHead.col] = 0;
            }

            if (moveQueue.length){
                myDirection = currentDirection = moveQueue.pop();
            }

            newHead.col = oldHead.col + columnShift[myDirection];
            newHead.row = oldHead.row + rowShift[myDirection];
            newHead.xPos = oldHead.xPos + xPosShift[myDirection];
            newHead.yPos = oldHead.yPos + yPosShift[myDirection];

            if ( !newHead.elmStyle ) {
                newHead.elmStyle = newHead.elm.style;
            }

            newHead.elmStyle.left = newHead.xPos + "px";
            newHead.elmStyle.top = newHead.yPos + "px";

            // check the new spot the snake moved into

            if (grid[newHead.row][newHead.col] === 0) {
                grid[newHead.row][newHead.col] = 1;
                setTimeout(function(){me.go();}, snakeSpeed);
            } else if (grid[newHead.row][newHead.col] > 0) {
                me.handleDeath();
            } else if (grid[newHead.row][newHead.col] === playingBoard.getGridFoodValue()) {
                grid[newHead.row][newHead.col] = 1;
                me.eatFood();
                setTimeout(function(){me.go();}, snakeSpeed);
            }
        };

        /**
        * This method is called when it is determined that the snake has eaten some food.
        * @method eatFood
        */
        me.eatFood = function() {
            if (blockPool.length <= growthIncr) {
                createBlocks(growthIncr*2);
            }
            var blocks = blockPool.splice(0, growthIncr);

            var ii = blocks.length,
                index,
                prevNode = me.snakeTail;
            while (ii--) {
                index = "b" + me.snakeLength++;
                me.snakeBody[index] = blocks[ii];
                me.snakeBody[index].prev = prevNode;
                me.snakeBody[index].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                me.snakeBody[index].elm.className += " snake-snakebody-alive";
                prevNode.next = me.snakeBody[index];
                prevNode = me.snakeBody[index];
            }
            me.snakeTail = me.snakeBody[index];
            me.snakeTail.next = me.snakeHead;
            me.snakeHead.prev = me.snakeTail;

            playingBoard.foodEaten();
        };

        /**
        * This method handles what happens when the snake dies.
        * @method handleDeath
        */
        me.handleDeath = function() {
            me.snakeHead.elm.style.zIndex = getNextHighestZIndex(me.snakeBody);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-alive\b/,'')
            me.snakeHead.elm.className += " snake-snakebody-dead";

            isDead = true;
            playingBoard.handleDeath();
            moveQueue.length = 0;
        };

        /**
        * This method sets a flag that lets the snake be alive again.
        * @method rebirth
        */
        me.rebirth = function() {
            isDead = false;
        };

        /**
        * This method reset the snake so it is ready for a new game.
        * @method reset
        */
        me.reset = function() {
            if (isDead === false) {return;}

            var blocks = [],
                curNode = me.snakeHead.next,
                nextNode;
            while (curNode !== me.snakeHead) {
                nextNode = curNode.next;
                curNode.prev = null;
                curNode.next = null;
                blocks.push(curNode);
                curNode = nextNode;
            }
            me.snakeHead.next = me.snakeHead;
            me.snakeHead.prev = me.snakeHead;
            me.snakeTail = me.snakeHead;
            me.snakeLength = 1;

            for (var ii = 0; ii < blocks.length; ii++) {
                blocks[ii].elm.style.left = "-1000px";
                blocks[ii].elm.style.top = "-1000px";
                blocks[ii].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                blocks[ii].elm.className += " snake-snakebody-alive";
            }

            blockPool.concat(blocks);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
            me.snakeHead.elm.className += " snake-snakebody-alive";
            me.snakeHead.row = config.startRow || 1;
            me.snakeHead.col = config.startCol || 1;
            me.snakeHead.xPos = me.snakeHead.row * playingBoard.getBlockWidth();
            me.snakeHead.yPos = me.snakeHead.col * playingBoard.getBlockHeight();
            me.snakeHead.elm.style.left = me.snakeHead.xPos + "px";
            me.snakeHead.elm.style.top = me.snakeHead.yPos + "px";
        };

        // ---------------------------------------------------------------------
        // Initialize
        // ---------------------------------------------------------------------

        createBlocks(growthIncr*2);
        xPosShift[0] = 0;
        xPosShift[1] = playingBoard.getBlockWidth();
        xPosShift[2] = 0;
        xPosShift[3] = -1 * playingBoard.getBlockWidth();

        yPosShift[0] = -1 * playingBoard.getBlockHeight();
        yPosShift[1] = 0;
        yPosShift[2] = playingBoard.getBlockHeight();
        yPosShift[3] = 0;
    };
})();
