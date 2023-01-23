function Senses(visionWidth, visionHeight, game) {
    // Import libraries
    var spawn = require('child_process').spawn,
        Frogeye = require('./sense/Frogeye.js'),
        frogeye = new Frogeye(),

        // Declare private objects
        raw = {},
        state = {},
        observers = {},
        perceivers = {},
        attention = {},
        // moods,
        imgPixelSize = visionWidth * visionHeight,
        imgRawFileSize = imgPixelSize * 1.5,
        partialImgData = '';

    // *Raw* state is unprocessed environment measurements received from sensors.
    // Raw state can only be written by observers and only read by perceivers
    raw.luma = {current: [], previous: []};
    raw.chroma = {U: [], V: []};

    // *Sense state* is a collection of all current sensory data.

    // *Perceptions* are the results of processing raw sense state
    // They can only be written by perceivers, but can be read by anything
    state.perceptions = {
        dimensions: [visionWidth, visionHeight],
        brightnessOverall: 0.0,
        edgesAny: [],
        edgesSuppressLight: [],
        edgesSuppressDark: [],
        generalIllumination: []
    };

    // Sense state is publically readable (but not changeable).
    this.senseState = function (type) {
        if (type) {
            return JSON.parse(JSON.stringify(state.perceptions[type]));
        }
        return JSON.parse(JSON.stringify(state));
    };

    function perceive() {
        // state.perceptions.brightnessOverall = raw.brightness / imgPixelSize / 256;
        perceivers.frogEye(imgPixelSize);
        // detectors();
    }
    this.perceive = perceive;

    // *Perceivers* process raw sense state into meaningful information
    perceivers.frogEye = function () {
        state.perceptions.edgesAny = frogeye.searchEdgesAny(raw.luma.current, imgPixelSize, visionWidth);
        state.perceptions.edgesSuppressLight = frogeye.searchEdgesSuppressLight(raw.luma.current, imgPixelSize, visionWidth);
        state.perceptions.edgesSuppressDark = frogeye.searchEdgesSuppressDark(raw.luma.current, imgPixelSize, visionWidth);
        state.perceptions.generalIllumination = frogeye.generalIllumination(raw.luma.current, imgPixelSize, visionWidth);
        state.perceptions.brightnessOverall = frogeye.brightnessOverall(raw.luma.current);
    };

    // *Observers* populate raw sense state from a creature's sensors.
    observers.vision = function (yuvData) {
        var lumaData = [],
            chromaU = [],
            chromaV = [],
            ii;

        raw.brightness = 0;

        // The Pi camera gives a lot of crap data in yuv time lapse mode.
        // This recovers some of it
        if (yuvData.length < imgRawFileSize - 1) {
            if (yuvData.length + partialImgData.length === imgRawFileSize) {
                yuvData = Buffer.concat([partialImgData, yuvData], imgRawFileSize);
            } else {
                partialImgData = yuvData;
                return;
            }
        }
        partialImgData = '';

        // Data conversion. In this case an array is built from part of a binary buffer.
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            lumaData.push(yuvData.readUInt8(ii));
            raw.brightness += yuvData.readUInt8(ii);
        }
        for (ii = imgPixelSize; ii < imgPixelSize * 1.25; ii += 1) {
            chromaU.push(yuvData.readUInt8(ii));
        }
        for (ii = imgPixelSize * 1.25; ii < imgPixelSize * 1.5; ii += 1) {
            chromaV.push(yuvData.readUInt8(ii));
        }

        // Set raw global sense state
        raw.luma.previous = raw.luma.current;
        raw.luma.current = lumaData;
        raw.chroma.U = chromaU;
        raw.chroma.V = chromaV;

        /*
        Perceivers should typically be handled by the attention object as a separate
        process, but for simplicity we'll just fire them off after the observer completes.
        */
        perceive();
    };

    // Other observers can be added here for sound, temperature, velocity, smell, whatever.

    // *Attention* is responsible for triggering observers and perceivers.
    attention = {};
    attention.look = function (timeLapseInterval) {
        var cam;

        timeLapseInterval = timeLapseInterval || 0;

        if (game) {
            game.play(observers);
        } else {
            cam = spawn('raspiyuv', [
                '-w', visionWidth.toString(10),
                '-h', visionHeight.toString(10),
                //'-p', '50, 80, 400, 300', // small preview window
                '--nopreview',
                '-awb', 'fluorescent', // color detection more consistent
                '-bm', // Burst mode - this causes a significant improvement in frame rate
                '-rot', '90', // My camera is sideways so rotate the image
                '-tl', timeLapseInterval.toString(10), // 0 = as fast as possible
                '-t', '300000', // Restart every 5 min
                '-o', '-' // To stdout
            ]);

            cam.stdout.on('data', function (data) {
                observers.vision(data);
            });

            cam.stderr.on('data', function (data) {
                console.log('stderr: ' + data);
            });

            cam.on('exit', function (code) {
                console.log('raspiyuv process exited with code ' + code);
                console.log('Restarting raspiyuv time lapse');
                attention.look(250);
            });
        }
    };

    this.start = function init() {
        console.log('Initialize senses module');
        attention.look(250);
    };
}

module.exports = Senses;
