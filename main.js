window.onerror = function(message, url, line){
	alert([message, url, line]);
}
var fractals = {
	worker_relative_path: "fractals/worker.js",
	chunks_per_dimension: 2,
	recursion_limit: 254,
	escape_radius: 2,
	sample_pixel_ratio: 2,
	control_size: 0.12,
	control_spacing: 0.05,
	zoom_factor: 2,
	initial_window_center_r: -1.5,
	initial_window_center_i: 0,
	initial_window_minimum_width: 0.4,
	initial_window_minimum_height: 0.2,
	canvas: null,
	workers: null,
	state: {
		view: {
			center_r: null,
			center_i: null,
			unit_pixel_ratio: null
		},
		zooming: {
			is_zooming: false,
			factor: null
		},
		rendering: {
			is_rendering: false,
			number_workers_working: null
		},
		resizing: {
			is_resizing: false,
			timeout: null
		},
		panning: {
			is_panning: false,
			x_naught: null,
			y_naught: null,
			offset_x: null,
			offset_y: null
		}
	},
	image_assets: {
		zoom_in: "fractals/zoom_in.svg",
		zoom_out: "fractals/zoom_out.svg",
		progress: "fractals/progress.svg"
	},
	image_data: null,
	controls: [
		{
			image: function(){return fractals.image_assets.zoom_in;},
			position: {
				x: function(){return fractals.control_spacing * fractals.canvas.height;},
				y: function(){return fractals.control_spacing * fractals.canvas.height;}
			},
			size: {
				x: function(){return fractals.control_size * fractals.canvas.height;},
				y: function(){return fractals.control_size * fractals.canvas.height;}
			},
			respond_to_click: function(){
				fractals.state.zooming.is_zooming = true;
				fractals.state.zooming.factor = 0.5;
				fractals.render_images();
				fractals.state.view.unit_pixel_ratio *= 0.5;
				fractals.start_render();
			}
		},
		{
			image: function(){return fractals.image_assets.zoom_out;},
			position: {
				x: function(){return fractals.control_spacing * fractals.canvas.height;},
				y: function(){return (2 * fractals.control_spacing + fractals.control_size) * fractals.canvas.height;}
			},
			size: {
				x: function(){return fractals.control_size * fractals.canvas.height;},
				y: function(){return fractals.control_size * fractals.canvas.height;}
			},
			respond_to_click: function(){
				fractals.state.zooming.is_zooming = true;
				fractals.state.zooming.factor = 2;
				fractals.render_images();
				fractals.state.view.unit_pixel_ratio *= 2;
				fractals.start_render();
			}
		}
	],
	initialize: function(canvas){
		fractals.canvas = canvas;
		fractals.load_image_assets();
		fractals.workers = [];
		fractals.image_data = [];
		for(var chunk_x = 0; chunk_x < fractals.chunks_per_dimension; chunk_x++){
			fractals.workers[chunk_x] = [];
			fractals.image_data[chunk_x] = [];
			for(var chunk_y = 0; chunk_y < fractals.chunks_per_dimension; chunk_y++){
				fractals.image_data[chunk_x][chunk_y] = null;
				fractals.workers[chunk_x][chunk_y] = new Worker(fractals.worker_relative_path);
				fractals.workers[chunk_x][chunk_y].postMessage({
					command: "INITIALIZE",
					chunk_x: chunk_x,
					chunk_y: chunk_y,
					escape_radius: fractals.escape_radius,
					recursion_limit: fractals.recursion_limit
				});
				fractals.workers[chunk_x][chunk_y].addEventListener("message", fractals.recieve_worker_results);
				fractals.workers[chunk_x][chunk_y].addEventListener("error", fractals.handle_worker_error);
			}
		}
		fractals.size_image();
		fractals.set_initial_view();
		fractals.canvas.addEventListener("mousedown", function(event){
			fractals.respond_to_pointer_down({x: event.pageX, y: event.pageY});
		});
		fractals.canvas.addEventListener("touchstart", function(event){
			event.preventDefault();
			fractals.respond_to_pointer_down({x: event.touches[0].pageX, y: event.touches[0].pageY});
		});
		fractals.canvas.addEventListener("mousemove", function(event){
			fractals.respond_to_pointer_move({x: event.pageX, y: event.pageY});
		});
		fractals.canvas.addEventListener("touchmove", function(event){
			event.preventDefault();
			fractals.respond_to_pointer_move({x: event.touches[0].pageX, y: event.touches[0].pageY});
		});
		fractals.canvas.addEventListener("mouseup", function(event){
			fractals.respond_to_pointer_up({x: event.pageX, y: event.pageY});
		});
		fractals.canvas.addEventListener("touchend", function(event){
			event.preventDefault();
			fractals.respond_to_pointer_up({x: event.changedTouches[0].pageX, y: event.changedTouches[0].pageY});
		});
		window.addEventListener("resize", function(){
			if(fractals.state.resizing.is_resizing){
				clearTimeout(fractals.state.resizing.timeout);
			}
			setTimeout(function(){
				fractals.size_image();
				fractals.start_render();
			}, 500);
		});
		fractals.start_render();
	},
	load_image_assets: function(){
		for(var asset in fractals.image_assets){
		    if(fractals.image_assets.hasOwnProperty(asset)){
		        var image = new Image();
		        image.src = fractals.image_assets[asset];
		        fractals.image_assets[asset] = image;
		    }
		}
	},
	recieve_worker_results: function(message){
		fractals.image_data[message.data.chunk_x][message.data.chunk_y] = new ImageData(new Uint8ClampedArray(message.data.buffer), fractals.canvas.width / fractals.chunks_per_dimension, fractals.canvas.height / fractals.chunks_per_dimension);
		fractals.state.rendering.number_workers_working--;
		if(fractals.state.rendering.number_workers_working == 0){
			clearTimeout(fractals.state.rendering.progress_timeout);
			fractals.state.rendering.is_rendering = false;
			fractals.state.panning.is_panning = false;
			fractals.state.panning.x_naught = null;
			fractals.state.panning.y_naught = null;
			fractals.state.panning.offset_x = null;
			fractals.state.panning.offset_y = null;
			fractals.state.zooming.is_zooming = false;
			fractals.state.zooming.factor = null;
			fractals.render_images();
		}
	},
	handle_worker_error: function(){
		console.log("Worker enountered error");
	},
	size_image: function(){
		fractals.canvas.width = fractals.canvas.clientWidth * fractals.sample_pixel_ratio;
		fractals.canvas.height = fractals.canvas.clientHeight * fractals.sample_pixel_ratio;
		for(var chunk_x = 0; chunk_x < fractals.chunks_per_dimension; chunk_x++){
			for(var chunk_y = 0; chunk_y < fractals.chunks_per_dimension; chunk_y++){
				fractals.workers[chunk_x][chunk_y].postMessage({
					command: "SET_SIZE",
					width: fractals.canvas.width / fractals.chunks_per_dimension,
					height: fractals.canvas.height / fractals.chunks_per_dimension
				});
			}
		}
	},
	set_initial_view: function(){
		fractals.state.view.center_r = fractals.initial_window_center_r;
		fractals.state.view.center_i = fractals.initial_window_center_i;
		var width_constrained_unit_pixel_ratio = fractals.initial_window_minimum_width / fractals.canvas.width;
		var height_constrained_unit_pixel_ratio = fractals.initial_window_minimum_height / fractals.canvas.height;
		fractals.state.view.unit_pixel_ratio = Math.max(width_constrained_unit_pixel_ratio, height_constrained_unit_pixel_ratio);
	},
	get_position: function(element){
	    var position = {x: 0, y: 0};
	    if(element.offsetParent) {
	        do{
	            position.x += element.offsetLeft;
	            position.y += element.offsetTop;
	        }while(element = element.offsetParent);
	    }
	    return position;
	},
	respond_to_pointer_down: function(position){
		if(fractals.state.rendering.is_rendering) return;
		var canvas_position = fractals.get_position(fractals.canvas);
		var offset = {x: position.x - canvas_position.x, y: position.y - canvas_position.y};
		for(var control_index = 0; control_index < fractals.controls.length; control_index++){
			if(offset.x * fractals.sample_pixel_ratio > fractals.controls[control_index].position.x()){
				if(offset.x * fractals.sample_pixel_ratio < fractals.controls[control_index].position.x() + fractals.controls[control_index].size.x()){
					if(offset.y * fractals.sample_pixel_ratio > fractals.controls[control_index].position.y()){
						if(offset.y * fractals.sample_pixel_ratio < fractals.controls[control_index].position.y() + fractals.controls[control_index].size.y()){
							fractals.controls[control_index].respond_to_click();
							return;
						}
					}
				}
			}
		}
		fractals.state.panning.is_panning = true;
		fractals.state.panning.x_naught = position.x;
		fractals.state.panning.y_naught = position.y;
	},
	respond_to_pointer_move: function(position){
		if(fractals.state.rendering.is_rendering) return;
		if(fractals.state.panning.is_panning){
			fractals.state.panning.offset_x = position.x - fractals.state.panning.x_naught;
			fractals.state.panning.offset_y = position.y - fractals.state.panning.y_naught;
			fractals.render_images();
		}
	},
	respond_to_pointer_up: function(position){
		if(fractals.state.rendering.is_rendering) return;
		if(fractals.state.panning.is_panning){
			fractals.state.panning.offset_x = position.x - fractals.state.panning.x_naught;
			fractals.state.panning.offset_y = position.y - fractals.state.panning.y_naught;
			fractals.state.view.center_r -= fractals.state.panning.offset_x * fractals.sample_pixel_ratio * fractals.state.view.unit_pixel_ratio;
			fractals.state.view.center_i += fractals.state.panning.offset_y * fractals.sample_pixel_ratio * fractals.state.view.unit_pixel_ratio;
			fractals.start_render();
			return;
		}
	},
	start_render: function(){
		if(fractals.state.rendering.is_rendering) return;
		fractals.state.rendering.is_rendering = true;
		fractals.state.rendering.number_workers_working = 0;
		for(var chunk_x = 0; chunk_x < fractals.chunks_per_dimension; chunk_x++){
			for(var chunk_y = 0; chunk_y < fractals.chunks_per_dimension; chunk_y++){
				fractals.state.rendering.number_workers_working++;
				fractals.workers[chunk_x][chunk_y].postMessage({
					command: "RENDER",
					top_left_r: fractals.state.view.center_r - (fractals.state.view.unit_pixel_ratio * fractals.canvas.width / 2) + fractals.state.view.unit_pixel_ratio * fractals.canvas.width / fractals.chunks_per_dimension * chunk_x,
					top_left_i: fractals.state.view.center_i + (fractals.state.view.unit_pixel_ratio * fractals.canvas.height / 2) - fractals.state.view.unit_pixel_ratio * fractals.canvas.height / fractals.chunks_per_dimension * chunk_y,
					unit_pixel_ratio: fractals.state.view.unit_pixel_ratio
				});
			}
		}
		fractals.state.rendering.progress_rotation = 0;
		fractals.state.rendering.progress_timeout = setTimeout(fractals.advance_progress, 10);
	},
	advance_progress: function(){
		fractals.canvas.getContext("2d").save();
		fractals.canvas.getContext("2d").translate(fractals.canvas.width - ((fractals.control_spacing + fractals.control_size / 2) * fractals.canvas.height), (fractals.control_spacing + fractals.control_size / 2) * fractals.canvas.height);
		fractals.canvas.getContext("2d").rotate(fractals.state.rendering.progress_rotation * Math.PI / 180);
		fractals.canvas.getContext("2d").drawImage(
			fractals.image_assets.progress,
			-fractals.control_size * fractals.canvas.height / 2,
			-fractals.control_size * fractals.canvas.height / 2,
			fractals.control_size * fractals.canvas.height,
			fractals.control_size * fractals.canvas.height
		);
		fractals.canvas.getContext("2d").restore();
		fractals.state.rendering.progress_rotation += 10;
		fractals.state.rendering.progress_timeout = setTimeout(fractals.advance_progress, 10);
	},
	render_images: function(){
		fractals.canvas.getContext("2d").clearRect(0, 0, fractals.canvas.width, fractals.canvas.height);
		for(var chunk_x = 0; chunk_x < fractals.chunks_per_dimension; chunk_x++){
			for(var chunk_y = 0; chunk_y < fractals.chunks_per_dimension; chunk_y++){
				fractals.canvas.getContext("2d").putImageData(
					fractals.image_data[chunk_x][chunk_y],
					fractals.canvas.width / fractals.chunks_per_dimension * chunk_x + (fractals.state.panning.is_panning ? fractals.state.panning.offset_x * fractals.sample_pixel_ratio: 0),
					fractals.canvas.height / fractals.chunks_per_dimension * chunk_y + (fractals.state.panning.is_panning ? fractals.state.panning.offset_y * fractals.sample_pixel_ratio: 0)
				);
			}
		}
		for(var control_index = 0; control_index < fractals.controls.length; control_index++){
			fractals.canvas.getContext("2d").drawImage(
				fractals.controls[control_index].image(),
				fractals.controls[control_index].position.x(),
				fractals.controls[control_index].position.y(),
				fractals.controls[control_index].size.x(),
				fractals.controls[control_index].size.y()
			);
		}
	}
};