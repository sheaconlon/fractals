fractals
========
Javascript plugin, turns any canvas into fractal viewer

features
========
* efficiency - Fractals utilizes multithreaded HTML5 web workers to achieve sub-second render time.
* customizability - Fractals exposes many configuration options as well as an easy mechanism for supplying a different coloring algorithm, making it possible to render any fractal (or any 2D graph).
* compatibility - Fractals works with both click and touch devices.

usage
=====
To initialize a viewer, call fractals.initialize(myCanvas), where myCanvas is a reference to the canvas which the viewer should be rendered in.

limitations
===========
* Fractals makes no attempt at backwards-compatibility. Browsers must have canvas, web workers, and web worker transferable objects, which creates problems with IE.
* State is global, therefore only one fractal viewer may be present on a given page.

todo
====
1. give each canvas its own state so that multiple viewers may be run on the same page
2. modularize the coloring algorithm to make it easier to change
3. select a license

