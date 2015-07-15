var fractals = {
	configuration: {
		minimum_initial_window: {
			r: 1,
			i: 0.5
		},
		maximum_recursions: 70,
		escape_radius: 2,
		control_height: 0.1,
		control_padding: 0.05,
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
		fractals.canvas = canvas;
		fractals.context = canvas.getContext("2d");
		fractals.resize();
		for(var image_index = 0; image_index < 2; image_index++){
			fractals.control_image_data[image_index] = new Image();
			fractals.control_image_data[image_index].width = fractals.canvas.height *  fractals.configuration.control_height;
			fractals.control_image_data[image_index].height = fractals.control_image_data[image_index].width;
		}
		fractals.control_image_data[0].src = "fractals/zoom_in.svg";
		fractals.control_image_data[1].src = "fractals/zoom_out.svg";
		fractals.canvas.addEventListener("mousedown", function(event){
			if(!fractals.rendering_state.rendering){
				if(event.offsetX > fractals.canvas.clientHeight * fractals.configuration.control_padding && event.offsetX < fractals.canvas.clientHeight * (fractals.configuration.control_padding + fractals.configuration.control_height)){
					if(event.offsetY > fractals.canvas.clientHeight * fractals.configuration.control_padding && event.offsetY < fractals.canvas.clientHeight * (fractals.configuration.control_padding + fractals.configuration.control_height)){
							fractals.view.unit_pixel_ratio /= 2;
							fractals.render();
					}else if(event.offsetY > fractals.canvas.clientHeight * (2 * fractals.configuration.control_padding + fractals.configuration.control_height) && event.offsetY < fractals.canvas.clientHeight * (2 * fractals.configuration.control_padding + 2 * fractals.configuration.control_height)){
							fractals.view.unit_pixel_ratio *= 2;
							fractals.render();
					}else{
						fractals.panning_state.panning = true;
						fractals.panning_state.previous_mouse_position.x = event.clientX;
						fractals.panning_state.previous_mouse_position.y = event.clientY;
					}
				}else{
					fractals.panning_state.panning = true;
					fractals.panning_state.previous_mouse_position.x = event.clientX;
					fractals.panning_state.previous_mouse_position.y = event.clientY;
				}
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
				for(var image_index = 0; image_index < 2; image_index++){
					fractals.context.drawImage(fractals.control_image_data[image_index], fractals.canvas.height * fractals.configuration.control_padding, fractals.canvas.height * fractals.configuration.control_padding * (image_index + 1) + fractals.canvas.height * fractals.configuration.control_height * image_index, fractals.control_image_data[image_index].height, fractals.control_image_data[image_index].height);
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
						for(var image_index = 0; image_index < 2; image_index++){
							fractals.context.drawImage(fractals.control_image_data[image_index], fractals.canvas.height * fractals.configuration.control_padding, fractals.canvas.height * fractals.configuration.control_padding * (image_index + 1) + fractals.canvas.height * fractals.configuration.control_height * image_index, fractals.control_image_data[image_index].height, fractals.control_image_data[image_index].height);
						}
						fractals.rendering_state.rendering = false;
					}
				};
			}
		}
		fractals.render();
	},
	render: function(){
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
	}
};