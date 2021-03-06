var Tone = require("tone");
var g = require("./current-env");
var async = require("./async-data");
var getLink = require("./encoder");
var sampleSet = require("./sampleSet");
var loadSequencer = require("./sequencer");
var Instrument  = require("./instrument");
var decoder = require("./decoder");

//jQuery helpers
$.fn.isOnScreen = function(){
    var viewport = {};
    viewport.top = $(window).scrollTop();
    viewport.bottom = viewport.top + $(window).height();
    var bounds = {};
    bounds.top = this.offset().top;
    bounds.bottom = bounds.top + this.outerHeight();
    return ((bounds.top <= viewport.bottom) && (bounds.bottom >= viewport.top));
};


//// NEXUS UI SET UP
function nexusSetting() {

    var dialResponsivity = [dial1, dial2, dial3, dial4, dial5, dial6, dial7];
    for (var i = 0; i < 7; i++) {
        dialResponsivity[i].responsivity = 0;
    }

    nx.colorize("#0affea");
    nx.colorize("fill", "#424242");

    matrix1.col = 16;
    matrix1.row = 8;
    matrix1.init();
    
    //add a method to clear the sequencer
    matrix1.clear = clear;

    onResize();
    decoder();
    
    g.setNexus(true);
    
    if (!g.getInstru().empty){
        loadSequencer(g.getInstru());
        loadPlayButtonHandler();
    }
    
    if (!g.getWeather().empty) {
        dialAnimationLauncher(g.getWeather());
    }
}



function loadSearchHandlers() {
    var $searchField = $("#searchTextField");

    //// ACTION SEARCH INPUT
    $searchField.on("keypress", function(e) {
        if (e.keyCode === 13) {
            setTimeout(function() {

                async.getPosition($searchField.val())
                    .then(async.getWeather)
                    .then(function(weather){
                        g.getInstru().connectFX(weather);
                        dialAnimation(weather);
                    });
            }, 50);
        }
    });

    $("body").on("mousedown", ".pac-container", function(e) {

        setTimeout(function() {

            async.getPosition($searchField.val())
                .then(async.getWeather)
                .then(function(weather){
                    g.getInstru().connectFX(weather);
                    dialAnimation(weather);
                });
        }, 50);
    });
}



//// PLAY BUTTON
function loadPlayButtonHandler() {

    var playButton = $('#toggle1');
    
    playButton.active = false;
    playButton.start = function() {
        var instrument = g.getInstru();
        if (instrument.wind.isOn && instrument.fxOn) instrument.wind.noise.start();
        Tone.Transport.start();
    };
    playButton.stop = function() {
        var instrument = g.getInstru();
        if (instrument.wind.isOn) instrument.wind.noise.stop();
        Tone.Transport.stop();
    };
    
    function bufferNotification(){
        var $message = messageToUser("Loading sounds");
        
        setInterval(function(){
            if (g.getBuffer()) $message.fadeOut(100);
        },500);
       
    }
    
    playButton.on('mousedown touchstart', function(e) {
        
        if (!playButton.active) {
            if (g.getBuffer()){
                playButton.active = true;
                playButton.start();
            }
            else {
                bufferNotification();
            }
        }
        else {
            playButton.active = false;
            playButton.stop();
        }
    });

    $(window).on("keydown", function(e) {
        if (e.keyCode === 32) {
            // if ($(window).scrollTop() <= 580) {
            //     $(".arrow").trigger("click");
            // }
            // else {
                if (!playButton.active) {
                    if (g.getBuffer()){
                        playButton.start();
                        toggle1.val.value = 1;
                        toggle1.draw();
                        playButton.active = true;
                    }
                    else{
                        bufferNotification();
                    }
                }
                else {
                    playButton.stop();
                    toggle1.val.value = 0;
                    toggle1.draw();
                    playButton.active = false;
                }
            // }
        }
    });
}


function displayWeatherData(data) {
    // TEMPERATURE
    if (typeof data.temperature !== "number") {
        $(".data1").text("n/a");
        $(".data1m").text("n/a");
    }
    else {
        $(".data1").text(Math.round(data.temperature) + "°F");
        $(".data1m").text(Math.round((data.temperature - 32) * (5 / 9)) + "°C");
    }
    //PRECIPITATION
    if (typeof data.precipIntensity !== "number") {
        $(".data2").text("n/a");
        $(".data2m").text("n/a");
    }
    else {
        $(".data2").text(Math.round(data.precipIntensity * 1000) / 1000 + " in/h");
        $(".data2m").text(Math.round((data.precipIntensity * 25.4)) + " mm/h");
    }
    //HUMIDITY
    if (typeof data.humidity !== "number") {
        $(".data3").text("n/a");
    }
    else {
        $(".data3").text(Math.round(data.humidity * 100) + "%");
    }
    //WIND SPEED
    if (typeof data.windSpeed !== "number") {
        $(".data4").text("n/a");
        $(".data4m").text("n/a");
    }
    else {
        $(".data4").text(Math.round(data.windSpeed) + " mph");
        $(".data4m").text(Math.round(data.windSpeed * 1.609344) + " km/h");
    }
    //VISIBILITY
    if (typeof data.visibility !== "number") {
        $(".data5").text("n/a");
        $(".data5m").text("n/a");
    }
    else {
        $(".data5").text(Math.round(data.visibility) + " mi");
        $(".data5m").text(Math.round(data.visibility * 1.609344) + " km");
    }
    //CLOUD COVER
    if (typeof data.cloudCover !== "number") {
        $(".data6").text("n/a");
    }
    else {
        $(".data6").text(Math.round(data.cloudCover * 100) + "%");
    }
    //NEAREST STORM
    if (typeof data.nearestStormDistance !== "number") {
        $(".data7").text("n/a");
        $(".data7m").text("n/a");
    }
    else {
        $(".data7").text(Math.round(data.nearestStormDistance) + " mi");
        $(".data7m").text(Math.round(data.nearestStormDistance * 1.609344) + " km");
    }
}


function dialAnimationLauncher(weather){
    //handling FX UI Motion
    var $dials = $(".console");
    if ($dials.isOnScreen()) {
        
        dialAnimation(weather);
    }
    else {//if not currently on screen, add event to trigger when motion automatically
        
        var $window = $(window);
        $window.on("scroll load", function dialDisplayHandler() {
            if ($dials.isOnScreen())
            {
                dialAnimation(weather);
                $window.unbind("scroll load",dialDisplayHandler);
            }
        });      
    }
}

function dialAnimation(data) {
    var $console = $(".console");
    if ($console.isOnScreen())
    {
        displayWeatherData(data);
    
        var valueDial = [dial1, dial2, dial3, dial4, dial5, dial6, dial7];
        for (var i = 0; i < valueDial.length; i++) {
            valueDial[i].val.value = 0;
        }
    
        var speed = [];
        
        for (var i = 0; i < 7; i++) {
            speed[i] = (Math.round(Math.random() * 22) + 8) / 1500;
        }
        
        //TEMPERATURE
        var val1 = (data.temperature + 30) / 134;
        if (data.temperature < -30 || typeof data.temperature !== "number") {
            val1 = 0;
            dial1.val.value = 0;
            dial1.init();
        }
        else if (data.temperature > 104) {
            val1 = 1;
        }
        var intDial1 = setInterval(function() {
            if (dial1.val.value >= val1) {
                dial1.val.value = val1;
                dial1.init();
                clearInterval(intDial1);
            }
            else {
                dial1.val.value += speed[0];
                dial1.init();
            }
        }, 20);
        
        //PRECIPITATION
        var val2 = (data.precipIntensity * 10) / 2;
        if (data.precipIntensity > 0.2) {
            val2 = 1;
        }
        else if (typeof data.precipIntensity !== "number") {
            val2 = 0;
            dial2.val.value = 0;
            dial2.init();
        }
        var intDial2 = setInterval(function() {
            if (dial2.val.value >= val2) {
                dial2.val.value = val2;
                dial2.init();
                clearInterval(intDial2);
            }
            else {
                dial2.val.value += speed[1];;
                dial2.init();
            }
        }, 20);
        
        //HUMIDITY
        var val3 = data.humidity;
        if (typeof data.humidity !== "number") {
            val3 = 0;
            dial3.val.value = 0;
            dial3.init();
        }
        var intDial3 = setInterval(function() {
            if (dial3.val.value >= val3) {
                dial3.val.value = val3;
                dial3.init();
                clearInterval(intDial3);
            }
            else {
                dial3.val.value += speed[2];
                dial3.init();
            }
        }, 20);
        
        //WIND SPEED
        var val4 = data.windSpeed / 40;
        if (data.windSpeed > 40) {
            val4 = 1;
        }
        else if (typeof data.windSpeed !== "number") {
            val4 = 0;
            dial4.val.value = 0;
            dial4.init();
        }
        var intDial4 = setInterval(function() {
            if (dial4.val.value >= val4) {
                dial4.val.value = val4;
                dial4.init();
                clearInterval(intDial4);
            }
            else {
                dial4.val.value += speed[3];
                dial4.init();
            }
        }, 20);
        
        //VISIBILITY
        var val5 = (data.visibility-10)/-10;
        if (typeof data.visibility !== "number") {
            val5 = 0;
            dial5.val.value = 0;
            dial5.init();
        }
        var intDial5 = setInterval(function() {
            if (dial5.val.value >= val5) {
                dial5.val.value = val5;
                dial5.init();
                clearInterval(intDial5);
            }
            else {
                dial5.val.value += speed[4];
                dial5.init();
            }
        }, 20);
        
        //CLOUD COVER
        var val6 = data.cloudCover;
        if (typeof data.cloudCover !== "number") {
            val6 = 0;
            dial6.val.value = 0;
            dial6.init();
        }
        var intDial6 = setInterval(function() {
            if (dial6.val.value >= val6) {
                dial6.val.value = val6;
                dial6.init();
                clearInterval(intDial6);
            }
            else {
                dial6.val.value += speed[5];
                dial6.init();
            }
        }, 20);
        
        //NEAREST STORM 0 600
        var val7 = 1 - (data.nearestStormDistance / 600);
        if (data.nearestStormDistance > 600 || typeof data.nearestStormDistance !== "number") {
            val7 = 0;
            dial7.val.value = 0;
            dial7.init();
        }
        var intDial7 = setInterval(function() {
            if (dial7.val.value >= val7) {
                dial7.val.value = val7;
                dial7.init();
                clearInterval(intDial7);
            }
            else {
                dial7.val.value += speed[6];
                dial7.init();
            }
        }, 20);
    }
}

function mainDisplayAnimation() {

    var $title = $(".title h1");
    if ($title.isOnScreen())
    {
        //// INPUT ANIMATION
        $("#searchTextField").animate({
            width: "100%"
        }, {
            queue: false,
            duration: 1000
        });
        //// 2ND TITLE ANIMATION
        $title.animate({
            opacity: 1
        }, {
            queue: false,
            duration: 2000
        });
        //// TRACK NAMES ANIMATION
        for (var i = 0; i <= 8; i++) {
            var duration = Math.floor(Math.random() * 1001) + 2000;
            $(".track-names p:nth-child(" + i + ")").animate({
                opacity: 1
            }, {
                queue: false,
                duration: duration
            });
        }
    }
    else //if not currently on screen, add event to trigger when motion automatically
    {
        var $window = $(window);
        $window.on("scroll load", function mainDisplayHandler() {
            if ($title.isOnScreen())
            {
                mainDisplayAnimation();
                $window.unbind("scroll load",mainDisplayHandler);
            }
        });
    }
}

//// TOGGLE IMPERIAL-METRIC
$(".input").on("click", ".system", function() {
    $(".switch").toggleClass("nodisplay");
    ($(".system").text() === "Switch to metric system") ? $(".system").text("Switch to imperial system"): $(".system").text("Switch to metric system");
});

//// ON RESIZE
function onResize(){
    var widthWinInit = $(window).width();
    $(window).on("resize", function() {
        var widthMove  = widthWinInit - $(window).width();
        widthWinInit = $(window).width();
        
        matrix1.resize(matrix1.width-widthMove,matrix1.height);
        $("#matrix1").attr("width",matrix1.width).attr("height",matrix1.height);
        matrix1.draw();
        
        $('#searchTextField').css("width", "100%");
        // toggle1.resize($('.toggle-size').width(), $('.toggle-size').height());
        toggle1.resize(toggle1.width-widthMove,toggle1.height);
    });
}

//// SCROLL EFFECT
$('a[href*=#]:not([href=#])').click(function() {

    if (location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') || location.hostname == this.hostname) {
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        if (target.length) {
            $('html,body').animate({
                scrollTop: target.offset().top
            }, 1000);
            return false;
        }
    }
});

///SHARE LINK BUTTON
$('.share').on('click', function() {
    var link = getLink();
    
    var $overlay = $('<div class="overlay"></div>');
    var $input = $('<input />');
    
    $overlay.append($input);
    $('body').append($overlay);
    $overlay.hide();
    
    
    $input.attr("value", link);
    $overlay.fadeIn(100);
    
    $(".overlay input").on("click", function(){
        this.select();
    });

    $overlay.on('click', function(evt) {
        if (evt.target === evt.currentTarget) {
            $overlay.fadeOut(100);
        }
    });
});

//// SWITCH ON/OFF FX
$('.onoffswitch-checkbox').on("click",function switchFX(){
    if (!g.getInstru().empty){
        var instrument = g.getInstru();
        if (instrument.fxOn) {
            instrument.disconnectFX();
            instrument.directToMaster();
            instrument.fxOn = false;
        }
        else {
            if (!g.getWeather().empty) instrument.connectFX(g.getWeather());
        }
    }
});

/// CLEAR THE MATRIX
function clear(){
    var grid = this.matrix;
    
    for (var y = 0; y < grid.length; y++){
        for (var x = 0; x < grid[y].length; x++){
           this.setCell(y,x,0);   
        }
    }
}

$(".menu li.clear-sequencer").on("click",function clearSeq(){
    if (matrix1) matrix1.clear();
});

/// DISPLAY TRACK NAMES
function displayTrackNames(instrument){
    var $trackBlock = $(".track-names");
    var trackNames = instrument.getTrackSetArray();

    $trackBlock.children().each(function(index,track){
        $(track).text(trackNames[index]);
    });
}

/// SELECT ANOTHER SOUND SET
function loadNewTrackSet(Set){
    
    //Buffer unload;
    g.setBuffer(false);
    console.log("buffer :" + g.getBuffer())
    var prevInstrument = g.getInstru();
    //Disconnect the existing sounds from the master
    prevInstrument.disconnectFX();

    //Recreate a new instrument and connect it
    var newInstrument = new Instrument(Set);
    var weather = g.getWeather();
    g.setInstru(newInstrument);
    
    displayTrackNames(newInstrument);
    if (!g.getWeather().empty) {newInstrument.connectFX(weather);}
    loadSequencer(newInstrument);
}


$(".menu .m2 li").on("click",function(){
    
    //Stop the sequencer if playing
    var playButton = $('#toggle1');
    toggle1.val.value = 0;
    toggle1.draw();
    playButton.active = false;
    
    var instrument = g.getInstru();
    if (instrument.wind.isOn) instrument.wind.noise.stop();
    Tone.Transport.stop();
    
    var $this = $(this);
    var soundSet = $this.text();
    if (sampleSet.hasOwnProperty(soundSet)) setTimeout(function() {loadNewTrackSet(sampleSet[soundSet]);}, 500);
    else {
        var $message = messageToUser("Sorry this soundset does not exist");
        $message.on('click', function(evt) {
            $message.fadeOut(100);
        });
    }
})


//// RELOAD URL ON ORIENTATION CHANGE
$(window).on('orientationchange', function(e) {
    var link = getLink();
    window.location.href = link;
    window.location.reload();
});

//// AUTOMATIC SELECT SEARCH INPUT
$("#searchTextField").on("click", function(){
    this.select();
});

//// Message to user with overlay
function messageToUser(textToDisplay){
    var $overlay = $('<div class="overlay"></div>');
    var $p = $('<p>');
    
    $overlay.append($p);
    $('body').append($overlay);
    $overlay.hide();
    
    
    $p.text(textToDisplay);
    $overlay.fadeIn(100);
    
    return $overlay;
}


$(".track-names").children().on("click",function(){
    var $this = $(this);
    var note = $this.text();
    var instrument = g.getInstru();
    instrument.toneSynth.triggerAttackRelease(note, "32n");
})


module.exports = {
    nexusSetting: nexusSetting,
    dialAnimation: dialAnimation,
    mainDisplayAnimation: mainDisplayAnimation,
    loadSearchHandlers:loadSearchHandlers,
    dialAnimationLauncher:dialAnimationLauncher,
    loadPlayButtonHandler: loadPlayButtonHandler,
    displayTrackNames:displayTrackNames
};
