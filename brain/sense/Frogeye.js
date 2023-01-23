global.tunable.senses.edgeAny = {};
global.tunable.senses.edgeAny.diff = 50;
global.tunable.senses.edgeAny.persist = 10;
global.tunable.senses.edgeSuppressLight = {};
global.tunable.senses.edgeSuppressLight.diff = 7;
global.tunable.senses.edgeSuppressDark = {};
global.tunable.senses.edgeSuppressDark.diff = 7;
global.tunable.senses.center = {};
global.tunable.senses.center.width = 0.2;
global.tunable.senses.generalIllumination = {};
global.tunable.senses.generalIllumination.size = 8;

function Frogeye() {
    var edgeAnyMem = [];

    function testEdgeAny(ii, visionWidth, imgPixelSize, luma, persist) {
        var adjacent = [];
        var diff = global.tunable.senses.edgeAny.diff;
        var persistence = global.tunable.senses.edgeAny.persist;

        if (ii > visionWidth) {
            adjacent.push(luma[ii - visionWidth]); // top
        }
        if (ii % visionWidth < visionWidth - 1) {
            adjacent.push(luma[ii + 1]); // right
        }
        if (ii < imgPixelSize - visionWidth) {
            adjacent.push(luma[ii + visionWidth]); // bottom
        }
        if (ii % visionWidth > 0) {
            adjacent.push(luma[ii - 1]); // left
        }

        // check adjacent for a significant increase in luma
        return adjacent.some(function (compare) {
            return (compare - luma[ii] > diff - persistence * persist);
        });
    }

    function testEdgeSuppressDark(ii, visionWidth, imgPixelSize, luma) {
        var surr = 0;

        if (ii > visionWidth) {
            surr = luma[ii - visionWidth];
        }
        if (ii % visionWidth < visionWidth - 1) {
            surr += luma[ii + 1];
        }
        if (ii < imgPixelSize - visionWidth) {
            surr += luma[ii + visionWidth];
        }
        if (ii % visionWidth > 0) {
            surr += luma[ii - 1];
        }
        return luma[ii] < (surr / 4) - global.tunable.senses.edgeSuppressDark.diff;
    }
    function testEdgeSuppressLight(ii, visionWidth, imgPixelSize, luma) {
        var surr = 0;

        if (ii > visionWidth) {
            surr = luma[ii - visionWidth];
        }
        if (ii % visionWidth < visionWidth - 1) {
            surr += luma[ii + 1];
        }
        if (ii < imgPixelSize - visionWidth) {
            surr += luma[ii + visionWidth];
        }
        if (ii % visionWidth > 0) {
            surr += luma[ii - 1];
        }
        return luma[ii] > (surr / 4) + global.tunable.senses.edgeSuppressLight.diff;
    }

    this.searchEdgesAny = function searchEdgesAny(luma, len, visionWidth) {
        var ii;
        var contrast = [];
        var persist = false;

        for (ii = 0; ii < len; ii += 1) {
            persist = edgeAnyMem.indexOf(ii) > -1;
            if (testEdgeAny(ii, visionWidth, len, luma, persist)) {
                contrast.push(ii);
            }
        }

        edgeAnyMem = contrast;

        return contrast;
    };

    this.searchEdgesSuppressLight = function searchEdgesSuppressLight(luma, len, visionWidth) {
        var ii,
            contrast = [];

        for (ii = 0; ii < len; ii += 1) {
            if (testEdgeSuppressLight(ii, visionWidth, len, luma)) {
                contrast.push(ii);
            }
        }

        return contrast;
    };

    this.searchEdgesSuppressDark = function searchEdgesSuppressDark(luma, len, visionWidth) {
        var ii,
            contrast = [];

        for (ii = 0; ii < len; ii += 1) {
            if (testEdgeSuppressDark(ii, visionWidth, len, luma)) {
                contrast.push(ii);
            }
        }

        return contrast;
    };

    function testGB(ii, visionWidth, imgPixelSize, luma) {
        var size = global.tunable.senses.generalIllumination.size;
        var col = (ii % Math.ceil(visionWidth / size));
        var row = Math.floor(ii / Math.ceil(visionWidth / size));

        var x = (row * size * visionWidth) + (col * size);
        var sum = 0;
        var jj;
        var kk;

        for (jj = 0; jj < size; jj += 1) {
            for (kk = 0; kk < size; kk += 1) {
                sum += luma[(jj * visionWidth) + x + kk];
            }
        }

        return sum / (size * size);
    }

    this.generalIllumination = function generalIllumination(luma, len, visionWidth) {
        var ii;
        var blobs = [];
        const cols = Math.ceil(visionWidth / global.tunable.senses.generalIllumination.size);
        const rows = Math.ceil(len / visionWidth / global.tunable.senses.generalIllumination.size);
        const blocks = cols * rows;

        for (ii = 0; ii < blocks; ii += 1) {
            blobs.push(testGB(ii, visionWidth, len, luma));
        }
        return blobs;
    };

    this.brightnessOverall = function brightnessOverall(luma) {
        return luma.reduce((a, b) => (a + b)) / luma.length;
    };

    // Find shapes and convexity
    // https://www.tutorialspoint.com/checking-for-convex-polygon-in-javascript
    // https://en.wikipedia.org/wiki/Delaunay_triangulation
}

module.exports = Frogeye;
