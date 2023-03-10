function Game() {
    var fs = require("fs"),
        observers;

    function show(photo) {
        fs.readFile(`${__dirname}/${photo}`, function (err, data) {
            if (err) {
                throw err;
            }
            observers.vision(data);
        });
    }

    function play(senseObservers) {
        observers = senseObservers;
        show("reddot-128.raw");
    }

    function act(actionData) {
        console.log(actionData.action, actionData.act, JSON.stringify(actionData.params));
    }

    this.play = play;
    this.act = act;
}

module.exports = Game;
