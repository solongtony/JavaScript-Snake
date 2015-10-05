
SNAKE.Board = SNAKE.Board || (function() {

    // -------------------------------------------------------------------------
    // Private static variables and methods
    // -------------------------------------------------------------------------

    var instanceNumber = 0;

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

    /*
        This function returns the width of the available screen real estate that we have
    */
    function getClientWidth(){
        var myWidth = 0;
        if( typeof window.innerWidth === "number" ) {
            myWidth = window.innerWidth;//Non-IE
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myWidth = document.documentElement.clientWidth;//IE 6+ in 'standards compliant mode'
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myWidth = document.body.clientWidth;//IE 4 compatible
        }
        return myWidth;
    }
    /*
        This function returns the height of the available screen real estate that we have
    */
    function getClientHeight(){
        var myHeight = 0;
        if( typeof window.innerHeight === "number" ) {
            myHeight = window.innerHeight;//Non-IE
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myHeight = document.documentElement.clientHeight;//IE 6+ in 'standards compliant mode'
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myHeight = document.body.clientHeight;//IE 4 compatible
        }
        return myHeight;
    }

    // -------------------------------------------------------------------------
    // Contructor + public and private definitions
    // -------------------------------------------------------------------------

    return function(inputConfig) {

        // --- private variables ---
        var me = this,
            myId = instanceNumber++,
            config = inputConfig || {},
            MAX_BOARD_COLS = 250,
            MAX_BOARD_ROWS = 250,
            blockWidth = 20,
            blockHeight = 20,
            GRID_FOOD_VALUE = -1, // the value of a spot on the board that represents snake food, MUST BE NEGATIVE
            myFood,
            mySnake,
            boardState = 1, // 0: in active; 1: awaiting game start; 2: playing game
            myKeyListener,
            isPaused = false,//note: both the board and the snake can be paused
            // Board components
            elmContainer, elmPlayingField, elmAboutPanel, elmLengthPanel, elmWelcome, elmTryAgain, elmPauseScreen;

        // --- public variables ---
        me.grid = [];

        // ---------------------------------------------------------------------
        // private functions
        // ---------------------------------------------------------------------

        function createBoardElements() {
            elmPlayingField = document.createElement("div");
            elmPlayingField.setAttribute("id", "playingField");
            elmPlayingField.className = "snake-playing-field";

            SNAKE.addEventListener(elmPlayingField, "click", function() {
                elmContainer.focus();
            }, false);

            elmPauseScreen = document.createElement("div");
            elmPauseScreen.className = "snake-pause-screen";
            elmPauseScreen.innerHTML = "<div style='padding:10px;'>[Paused]<p/>Press [space] to unpause.</div>";

            elmAboutPanel = document.createElement("div");
            elmAboutPanel.className = "snake-panel-component";
            elmAboutPanel.innerHTML = "<a href='http://patorjk.com/blog/software/' class='snake-link'>more patorjk.com apps</a> - <a href='https://github.com/patorjk/JavaScript-Snake' class='snake-link'>source code</a>";

            elmLengthPanel = document.createElement("div");
            elmLengthPanel.className = "snake-panel-component";
            elmLengthPanel.innerHTML = "Length: 1";

            elmWelcome = createWelcomeElement();
            elmTryAgain = createTryAgainElement();

            SNAKE.addEventListener( elmContainer, "keyup", function(evt) {
                if (!evt) var evt = window.event;
                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            }, false);

            elmContainer.className = "snake-game-container";

            elmPauseScreen.style.zIndex = 10000;
            elmContainer.appendChild(elmPauseScreen);
            elmContainer.appendChild(elmPlayingField);
            elmContainer.appendChild(elmAboutPanel);
            elmContainer.appendChild(elmLengthPanel);
            elmContainer.appendChild(elmWelcome);
            elmContainer.appendChild(elmTryAgain);

            mySnake = new SNAKE.Snake({playingBoard:me,startRow:2,startCol:2});
            myFood = new SNAKE.Food({playingBoard: me});

            elmWelcome.style.zIndex = 1000;
        }
        function maxBoardWidth() {
            return MAX_BOARD_COLS * me.getBlockWidth();
        }
        function maxBoardHeight() {
            return MAX_BOARD_ROWS * me.getBlockHeight();
        }

        function createWelcomeElement() {
            var tmpElm = document.createElement("div");
            tmpElm.id = "sbWelcome" + myId;
            tmpElm.className = "snake-welcome-dialog";

            var welcomeTxt = document.createElement("div");
            var fullScreenText = "";
            if (config.fullScreen) {
                fullScreenText = "On Windows, press F11 to play in Full Screen mode.";
            }
            welcomeTxt.innerHTML = "JavaScript Snake<p></p>Use the <strong>arrow keys</strong> on your keyboard to play the game. " + fullScreenText + "<p></p>";
            var welcomeStart = document.createElement("button");
            welcomeStart.appendChild( document.createTextNode("Play Game"));

            var loadGame = function() {
                SNAKE.removeEventListener(window, "keyup", kbShortcut, false);
                tmpElm.style.display = "none";
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };

            var kbShortcut = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    loadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbShortcut, false);
            SNAKE.addEventListener(welcomeStart, "click", loadGame, false);

            tmpElm.appendChild(welcomeTxt);
            tmpElm.appendChild(welcomeStart);
            return tmpElm;
        }

        function createTryAgainElement() {
            var tmpElm = document.createElement("div");
            tmpElm.id = "sbTryAgain" + myId;
            tmpElm.className = "snake-try-again-dialog";

            var tryAgainTxt = document.createElement("div");
            tryAgainTxt.innerHTML = "JavaScript Snake<p></p>You died :(.<p></p>";
            var tryAgainStart = document.createElement("button");
            tryAgainStart.appendChild( document.createTextNode("Play Again?"));

            var reloadGame = function() {
                tmpElm.style.display = "none";
                me.resetBoard();
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };

            var kbTryAgainShortcut = function(evt) {
                if (boardState !== 0 || tmpElm.style.display !== "block") {return;}
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    reloadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbTryAgainShortcut, true);

            SNAKE.addEventListener(tryAgainStart, "click", reloadGame, false);
            tmpElm.appendChild(tryAgainTxt);
            tmpElm.appendChild(tryAgainStart);
            return tmpElm;
        }

        // ---------------------------------------------------------------------
        // public functions
        // ---------------------------------------------------------------------

        me.setPaused = function(val) {
            isPaused = val;
            mySnake.setPaused(val);
            if (isPaused) {
                elmPauseScreen.style.display = "block";
            } else {
                elmPauseScreen.style.display = "none";
            }
        };
        me.getPaused = function() {
            return isPaused;
        };

        /**
        * Resets the playing board for a new game.
        * @method resetBoard
        */
        me.resetBoard = function() {
            SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);
            mySnake.reset();
            elmLengthPanel.innerHTML = "Length: 1";
            me.setupPlayingField();
        };
        /**
        * Gets the current state of the playing board. There are 3 states: 0 - Welcome or Try Again dialog is present. 1 - User has pressed "Start Game" on the Welcome or Try Again dialog but has not pressed an arrow key to move the snake. 2 - The game is in progress and the snake is moving.
        * @method getBoardState
        * @return {Number} The state of the board.
        */
        me.getBoardState = function() {
            return boardState;
        };
        /**
        * Sets the current state of the playing board. There are 3 states: 0 - Welcome or Try Again dialog is present. 1 - User has pressed "Start Game" on the Welcome or Try Again dialog but has not pressed an arrow key to move the snake. 2 - The game is in progress and the snake is moving.
        * @method setBoardState
        * @param {Number} state The state of the board.
        */
        me.setBoardState = function(state) {
            boardState = state;
        };
        /**
        * @method getGridFoodValue
        * @return {Number} A number that represents food on a number representation of the playing board.
        */
        me.getGridFoodValue = function() {
            return GRID_FOOD_VALUE;
        };
        /**
        * @method getPlayingFieldElement
        * @return {DOM Element} The div representing the playing field (this is where the snake can move).
        */
        me.getPlayingFieldElement = function() {
            return elmPlayingField;
        };
        /**
        * @method setBoardContainer
        * @param {DOM Element or String} myContainer Sets the container element for the game.
        */
        me.setBoardContainer = function(myContainer) {
            if (typeof myContainer === "string") {
                myContainer = document.getElementById(myContainer);
            }
            if (myContainer === elmContainer) {return;}
            elmContainer = myContainer;
            elmPlayingField = null;

            me.setupPlayingField();
        };
        /**
        * @method getBoardContainer
        * @return {DOM Element}
        */
        me.getBoardContainer = function() {
            return elmContainer;
        };
        /**
        * @method getBlockWidth
        * @return {Number}
        */
        me.getBlockWidth = function() {
            return blockWidth;
        };
        /**
        * @method getBlockHeight
        * @return {Number}
        */
        me.getBlockHeight = function() {
            return blockHeight;
        };
        /**
        * Sets up the playing field.
        * @method setupPlayingField
        */
        me.setupPlayingField = function () {

            if (!elmPlayingField) {createBoardElements();} // create playing field

            // calculate width of our game container
            var cWidth, cHeight;
            if (config.fullScreen === true) {
                cTop = 0;
                cLeft = 0;
                cWidth = getClientWidth()-5;
                cHeight = getClientHeight()-5;
                document.body.style.backgroundColor = "#FC5454";
            } else {
                cTop = config.top;
                cLeft = config.left;
                cWidth = config.width;
                cHeight = config.height;
            }

            // define the dimensions of the board and playing field
            var wEdgeSpace = me.getBlockWidth()*2 + (cWidth % me.getBlockWidth());
            var fWidth = Math.min(maxBoardWidth()-wEdgeSpace,cWidth-wEdgeSpace);
            var hEdgeSpace = me.getBlockHeight()*3 + (cHeight % me.getBlockHeight());
            var fHeight = Math.min(maxBoardHeight()-hEdgeSpace,cHeight-hEdgeSpace);

            elmContainer.style.left = cLeft + "px";
            elmContainer.style.top = cTop + "px";
            elmContainer.style.width = cWidth + "px";
            elmContainer.style.height = cHeight + "px";
            elmPlayingField.style.left = me.getBlockWidth() + "px";
            elmPlayingField.style.top  = me.getBlockHeight() + "px";
            elmPlayingField.style.width = fWidth + "px";
            elmPlayingField.style.height = fHeight + "px";

            // the math for this will need to change depending on font size, padding, etc
            // assuming height of 14 (font size) + 8 (padding)
            var bottomPanelHeight = hEdgeSpace - me.getBlockHeight();
            var pLabelTop = me.getBlockHeight() + fHeight + Math.round((bottomPanelHeight - 30)/2) + "px";

            elmAboutPanel.style.top = pLabelTop;
            elmAboutPanel.style.width = "450px";
            elmAboutPanel.style.left = Math.round(cWidth/2) - Math.round(450/2) + "px";

            elmLengthPanel.style.top = pLabelTop;
            elmLengthPanel.style.left = cWidth - 120 + "px";

            // if width is too narrow, hide the about panel
            if (cWidth < 700) {
                elmAboutPanel.style.display = "none";
            } else {
                elmAboutPanel.style.display = "block";
            }

            me.grid = [];
            var numBoardCols = fWidth / me.getBlockWidth() + 2;
            var numBoardRows = fHeight / me.getBlockHeight() + 2;

            for (var row = 0; row < numBoardRows; row++) {
                me.grid[row] = [];
                for (var col = 0; col < numBoardCols; col++) {
                    if (col === 0 || row === 0 || col === (numBoardCols-1) || row === (numBoardRows-1)) {
                        me.grid[row][col] = 1; // an edge
                    } else {
                        me.grid[row][col] = 0; // empty space
                    }
                }
            }

            myFood.randomlyPlaceFood();

            // setup event listeners

            myKeyListener = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;

                if (me.getBoardState() === 1) {
                    if ( !(keyNum >= 37 && keyNum <= 40) && !(keyNum === 87 || keyNum === 65 || keyNum === 83 || keyNum === 68)) {return;} // if not an arrow key, leave

                    // This removes the listener added at the #listenerX line
                    SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);

                    myKeyListener = function(evt) {
                        if (!evt) var evt = window.event;
                        var keyNum = (evt.which) ? evt.which : evt.keyCode;

                        //console.log(keyNum);
                        if (keyNum === 32) {
                            me.setPaused(!me.getPaused());
                        }

                        mySnake.handleArrowKeys(keyNum);

                        evt.cancelBubble = true;
                        if (evt.stopPropagation) {evt.stopPropagation();}
                        if (evt.preventDefault) {evt.preventDefault();}
                        return false;
                    };
                    SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);

                    mySnake.rebirth();
                    mySnake.handleArrowKeys(keyNum);
                    me.setBoardState(2); // start the game!
                    mySnake.go();
                }

                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            };

            // Search for #listenerX to see where this is removed
            SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);
        };

        /**
        * This method is called when the snake has eaten some food.
        * @method foodEaten
        */
        me.foodEaten = function() {
            elmLengthPanel.innerHTML = "Length: " + mySnake.snakeLength;
            myFood.randomlyPlaceFood();
        };

        /**
        * This method is called when the snake dies.
        * @method handleDeath
        */
        me.handleDeath = function() {
            var index = Math.max(getNextHighestZIndex( mySnake.snakeBody), getNextHighestZIndex( {tmp:{elm:myFood.getFoodElement()}} ));
            elmContainer.removeChild(elmTryAgain);
            elmContainer.appendChild(elmTryAgain);
            elmTryAgain.style.zIndex = index;
            elmTryAgain.style.display = "block";
            me.setBoardState(0);
        };

        // ---------------------------------------------------------------------
        // Initialize
        // ---------------------------------------------------------------------

        config.fullScreen = (typeof config.fullScreen === "undefined") ? false : config.fullScreen;
        config.top = (typeof config.top === "undefined") ? 0 : config.top;
        config.left = (typeof config.left === "undefined") ? 0 : config.left;
        config.width = (typeof config.width === "undefined") ? 400 : config.width;
        config.height = (typeof config.height === "undefined") ? 400 : config.height;

        if (config.fullScreen) {
            SNAKE.addEventListener(window,"resize", function() {
                me.setupPlayingField();
            }, false);
        }

        me.setBoardState(0);

        if (config.boardContainer) {
            me.setBoardContainer(config.boardContainer);
        }

    }; // end return function
})();
