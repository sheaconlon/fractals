var fractals = {
	configuration: {
		minimum_initial_window: {
			r: 1,
			i: 0.5
		},
		maximum_recursions: 50,
		escape_radius: 2,
		control_height: 0.1,
		control_padding: 0.02,
		resolution_factor: 2
	},
	cached_references: {
		canvas: null,
		context: null
	},
	rendering_state: {
		rendering: false,
		number_workers_working: 0
	},
	view: {
		center: {
			r: -1.6,
			i: 0
		},
		unit_pixel_ratio: null,
		width: null,
		half_width: null,
		height: null,
		half_height: null,
		odd_width: null, 
		odd_height: null
	},
	panning_state: {
		offset: {
			x: null,
			y: null
		},
		previous_mouse_position: {
			x: null,
			y: null
		},
		panning: false
	},
	zooming_state: {
		zooming: false
	},
	resizing_state: {
		timeout: null
	},
	workers: [
		[new Worker("fractals/worker.js"), new Worker("fractals/worker.js")],
		[new Worker("fractals/worker.js"), new Worker("fractals/worker.js")]
	],
	render_image_data: [
		[null, null],
		[null, null]
	],
	control_image_data: [null, null],
	init: function(canvas){
		console.log("fractals starting init");
		fractals.canvas = canvas;
		fractals.context = canvas.getContext("2d");
		fractals.resize();
		fractals.canvas.addEventListener("mousedown", function(event){
			if(!fractals.rendering_state.rendering){
				fractals.panning_state.panning = true;
				fractals.panning_state.previous_mouse_position.x = event.clientX;
				fractals.panning_state.previous_mouse_position.y = event.clientY;
			}
		});
		fractals.canvas.addEventListener("mousemove", function(event){
			if(fractals.panning_state.panning){
				fractals.panning_state.offset.x += event.clientX - fractals.panning_state.previous_mouse_position.x;
				fractals.panning_state.offset.y += event.clientY - fractals.panning_state.previous_mouse_position.y;
				fractals.panning_state.previous_mouse_position.x = event.clientX;
				fractals.panning_state.previous_mouse_position.y = event.clientY;
				fractals.context.clearRect(0, 0, fractals.view.width, fractals.view.height);
				for(var x_quadrant = 0; x_quadrant < 2; x_quadrant++){
					for(var y_quadrant = 0; y_quadrant < 2; y_quadrant++){
						var x = fractals.panning_state.offset.x + (x_quadrant * fractals.view.half_width);
						var y = fractals.panning_state.offset.y + (y_quadrant * fractals.view.half_height);
						fractals.context.putImageData(fractals.render_image_data[x_quadrant][y_quadrant], x, y);
					}
				}
			}
		});
		fractals.canvas.addEventListener("mouseup", function(){
			if(fractals.panning_state.panning == true){
				fractals.panning_state.panning = false;
				fractals.view.center.r -= fractals.panning_state.offset.x * fractals.view.unit_pixel_ratio;
				fractals.view.center.i += fractals.panning_state.offset.y * fractals.view.unit_pixel_ratio;
				fractals.panning_state.offset.x = 0;
				fractals.panning_state.offset.y = 0;
				fractals.render();
			}
		});
		window.addEventListener("resize", function(){
			clearTimeout(fractals.resizing_state.timeout)
			fractals.resizing_state.timeout = setTimeout(function(){
				fractals.resize();
				fractals.render();
			}, 500);
		});
		if(fractals.configuration.minimum_initial_window.r / fractals.view.width > fractals.configuration.minimum_initial_window.i / fractals.view.height){
			fractals.view.unit_pixel_ratio = fractals.configuration.minimum_initial_window.r / fractals.view.width;
		}else{
			fractals.view.unit_pixel_ratio = fractals.configuration.minimum_initial_window.i / fractals.view.height;
		}
		for(var x_quadrant = 0; x_quadrant < 2; x_quadrant++){
			for(var y_quadrant = 0; y_quadrant < 2; y_quadrant++){
				fractals.workers[x_quadrant][y_quadrant].onmessage = function(message){
					var image_data_array = message.data[0];
					var worker_fractals = message.data[1];
					fractals.render_image_data[worker_fractals.x_quadrant][worker_fractals.y_quadrant] = new ImageData(image_data_array, worker_fractals.render_width, worker_fractals.render_height);
					fractals.context.putImageData(fractals.render_image_data[worker_fractals.x_quadrant][worker_fractals.y_quadrant], worker_fractals.x_quadrant * fractals.view.half_width + (fractals.view.odd_width * (worker_fractals.x_quadrant > 0)), worker_fractals.y_quadrant * fractals.view.half_height + fractals.view.odd_height * (worker_fractals.y_quadrant > 0));
					fractals.rendering_state.number_workers_working--;
					if(fractals.rendering_state.number_workers_working == 0){
						fractals.rendering_state.rendering = false;
						console.log("fractals finished render");
					}
				};
			}
		}
		fractals.render();
		console.log("fractals finished init");
	},
	render: function(){
		console.log("fractals starting render");
		fractals.rendering_state.rendering = true;
		for(var x_quadrant = 0; x_quadrant < 2; x_quadrant++){
			for(var y_quadrant = 0; y_quadrant < 2; y_quadrant++){
				fractals.rendering_state.number_workers_working++;
				fractals.workers[x_quadrant][y_quadrant].postMessage({
					c_r_start: fractals.view.center.r - (1 - x_quadrant) * (fractals.view.half_width + (fractals.view.odd_width * (x_quadrant == 0))) * fractals.view.unit_pixel_ratio,
					c_i_start: fractals.view.center.i + (1 - y_quadrant) * (fractals.view.half_height + (fractals.view.odd_height * (y_quadrant == 0))) * fractals.view.unit_pixel_ratio,
					unit_pixel_ratio: fractals.view.unit_pixel_ratio,
					render_width: fractals.view.half_width + (fractals.view.odd_width * (x_quadrant == 0)),
					render_height: fractals.view.half_height + (fractals.view.odd_height * (y_quadrant == 0)),
					x_quadrant: x_quadrant,
					y_quadrant: y_quadrant,
					maximum_recursions: fractals.configuration.maximum_recursions,
					escape_radius: fractals.configuration.escape_radius
				});
			}
		}
	},
	resize: function(){
		console.log("fractals starting resize");
		var clientWidth = fractals.canvas.clientWidth;
		var clientHeight = fractals.canvas.clientHeight;
		fractals.canvas.width = clientWidth * fractals.configuration.resolution_factor;
		if(fractals.canvas.width % 2 != 0){
			fractals.view.odd_width = 1;
		}else{
			fractals.view.odd_width = 0;
		}
		fractals.canvas.height = clientHeight * fractals.configuration.resolution_factor;
		if(fractals.canvas.height % 2 != 0){
			fractals.view.odd_height = 1;
		}else{
			fractals.view.odd_width = 0;
		}
		fractals.view.width = fractals.canvas.width;
		fractals.view.half_width = Math.floor(fractals.view.width / 2);
		fractals.view.height = fractals.canvas.height;
		fractals.view.half_height = Math.floor(fractals.view.height / 2);
		console.log("fractals finished resize");
	}
};