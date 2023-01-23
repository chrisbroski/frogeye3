/*
Brain.js loads and initializes Senses, Actions, and Behaviors modules.
It also connects to a viewer for perception visualization and manual action control.
*/

global.tunable = {};
global.tunable.senses = {};

var Senses = require('./Senses.js'),
    Viewer = require('./Viewer.js'),
    Games = require('./Games.js'),
    config = {},
    senses,
    viewer,
    game,
    gameName,
    cli_position,
    supported_widths = ['32', '64', '128', '256'];

config.visionWidth = 128;
config.visionHeight = 96;

// Set up CLI interface
if (process.argv.indexOf("-v") > -1 || process.argv.indexOf("--version") > -1) {
    console.log(require('../package.json').version);
    process.exit();
}

if (process.argv.indexOf("-h") > -1 || process.argv.indexOf("--help") > -1) {
    console.log(`
DESCRIPTION

    Frogeye is a platform for exploring the visual processing
    in the vertebrate retina.

ARGUMENTS

    --version, -v       Version of main npm package

    --game, -g <game>   Start brain in game mode. If more than one
                        game is available, list supported games.

    --width, -w         Run brain with specified visual resolution
                        (default 128) If an unsupported resolution
                        is specified, list valid parameters

    --help, -h          This documentation
`);
    process.exit();
}

cli_position = process.argv.indexOf("-g");
if (cli_position === -1) {
    cli_position = process.argv.indexOf("--game");
}
if (cli_position > -1) {
    if (cli_position < process.argv.length - 1) {
        gameName = process.argv[cli_position + 1];
        if (gameName.slice(0, 1) === "-") {
            gameName = null;
        }
    }
    game = new Games(gameName);
}

cli_position = process.argv.indexOf("-w");
if (cli_position === -1) {
    cli_position = process.argv.indexOf("--visionwidth");
}
if (cli_position > -1) {
    if (supported_widths.indexOf(process.argv[cli_position + 1]) > -1) {
        config.visionWidth = +process.argv[cli_position + 1];
        config.visionHeight = config.visionWidth * 3 / 4;
    } else {
        console.log("Supported vision widths: ", supported_widths.join(", "));
        process.exit();
    }
}

// Instantiate main modules
senses = new Senses(config.visionWidth, config.visionHeight, game);
viewer = new Viewer(senses);

senses.start();
viewer.start();

// Code below is to handle exits more gracefully
// From http://stackoverflow.com/questions/14031763/#answer-14032965

process.stdin.resume();

function exitHandler(options, err) {
    if (err) {
        console.log(err.stack);
    }

    if (options.exit) {
        process.exit();
    }
}

process.on('exit', exitHandler.bind(null, {cleanup: true}));
process.on('SIGINT', exitHandler.bind(null, {exit: true}));
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
