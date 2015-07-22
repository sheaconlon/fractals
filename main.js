var fractals = {
	configuration: {
		image: {
			recursion_limit: 254,
			escape_radius: 2,
			sample_pixel_ratio: 2
		},
		user_interface: {
			control_height: 0.1,
			control_spacing: 0.05,
			readout_height: 0.02,
			zoom_factor: 2
		},
		initial_window: {
			r: 0.4,
			i: 0.2
		}
	},
	state: {
		center: {
			r: -1.4,
			i: 0
		},
		unit_pixel_ratio: null,
		panning: {
			panning: false,
			x_naught: null,
			y_naught: null,
			offset_x: null,
			offset_y: null
		},
		zooming: {
			zooming: false,
			factor: null
		},
		rendering: {
			rendering: false,
			number_workers_working: null,
			progress_rotation: null,
			progress_image: null
		},
		resizing: {
			resizing: false,
			timeout: null
		}
	},
	references: {
		canvas: null,
		context: null,
		workers: [[null, null], [null, null]],
		image_data: [[null, null], [null, null]]
	},
	controls: [
		{
			image_relative_path: "fractals/zoom_in.svg",
			image: null,
			position: {
				x: function(){return fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height;},
				y: function(){return fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height;}
			},
			size: {
				x: function(){return fractals.configuration.user_interface.control_height * fractals.references.canvas.height;},
				y: function(){return fractals.configuration.user_interface.control_height * fractals.references.canvas.height;}
			},
			respond_to_click: function(){
				fractals.state.zooming.zooming = true;
				fractals.state.zooming.factor = 0.5;
				fractals.state.unit_pixel_ratio *= 0.5;
				fractals.start_render();
			}
		},
		{
			image_relative_path: "fractals/zoom_out.svg",
			image: null,
			position: {
				x: function(){return fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height;},
				y: function(){return (2 * fractals.configuration.user_interface.control_spacing + fractals.configuration.user_interface.control_height) * fractals.references.canvas.height;}
			},
			size: {
				x: function(){return fractals.configuration.user_interface.control_height * fractals.references.canvas.height;},
				y: function(){return fractals.configuration.user_interface.control_height * fractals.references.canvas.height;}
			},
			respond_to_click: function(){
				fractals.state.zooming.zooming = true;
				fractals.state.zooming.factor = 2;
				fractals.state.unit_pixel_ratio *= 2;
				fractals.start_render();
			}
		}
	],
	initialize: function(canvas){
		fractals.references.canvas = canvas;
		fractals.references.context = fractals.references.canvas.getContext("2d");

		fractals.for_each_quadrant(function(quadrant_x, quadrant_y){
			fractals.references.workers[quadrant_x][quadrant_y] = new Worker("fractals/worker.js");
			fractals.references.workers[quadrant_x][quadrant_y].postMessage({
				type: "INITIALIZE",
				quadrant_x: quadrant_x,
				quadrant_y, quadrant_y,
				escape_radius: fractals.configuration.image.escape_radius,
				recursion_limit: fractals.configuration.image.recursion_limit
			});
			fractals.references.workers[quadrant_x][quadrant_y].addEventListener("message", fractals.respond_to_message);
			fractals.references.workers[quadrant_x][quadrant_y].addEventListener("error", function(event){console.log(event.message);});
		});

		window.addEventListener("resize", fractals.respond_to_window_resize);
		fractals.set_size();

		fractals.state.unit_pixel_ratio = fractals.maximum_zoom_for_initial_window();

		fractals.for_each_control(function(control_index){
			fractals.controls[control_index].image = new Image();
			fractals.controls[control_index].image.src = fractals.controls[control_index].image_relative_path;
		});

		fractals.state.rendering.progress_image = new Image();
		fractals.state.rendering.progress_image.src = "fractals/progress.svg";

		fractals.references.canvas.addEventListener("mousedown", fractals.respond_to_mousedown)
		fractals.references.canvas.addEventListener("mousemove", fractals.respond_to_mousemove);
		fractals.references.canvas.addEventListener("mouseup", fractals.respond_to_mouseup);

		fractals.start_render();
	},
	set_size: function(){
		fractals.references.canvas.width = fractals.references.canvas.clientWidth * fractals.configuration.image.sample_pixel_ratio;
		fractals.references.canvas.height = fractals.references.canvas.clientHeight * fractals.configuration.image.sample_pixel_ratio;
		
		fractals.for_each_quadrant(function(quadrant_x, quadrant_y){
			fractals.references.workers[quadrant_x][quadrant_y].postMessage({
				type: "SET_SIZE",
				width: fractals.references.canvas.width / 2,
				height: fractals.references.canvas.height / 2
			});
		});
	},
	respond_to_window_resize: function(){
		if(fractals.state.resizing.resizing){
			clearTimeout(fractals.state.resizing.timeout);
		}
		setTimeout(function(){
			fractals.set_size();
			fractals.start_render();
		}, 500);
	},
	maximum_zoom_for_initial_window: function(){
		var width_constrained_unit_pixel_ratio = fractals.configuration.initial_window.r / fractals.references.canvas.width;
		var height_constrained_unit_pixel_ratio = fractals.configuration.initial_window.i / fractals.references.canvas.height;
		return Math.max(width_constrained_unit_pixel_ratio, height_constrained_unit_pixel_ratio);
	},
	for_each_quadrant: function(fn){
		for(var quadrant_x = 0; quadrant_x < 2; quadrant_x++){
			for(var quadrant_y = 0; quadrant_y < 2; quadrant_y++){
				fn(quadrant_x, quadrant_y);
			}
		}
	},
	for_each_control: function(fn){
		for(var control_index = 0; control_index < fractals.controls.length; control_index++){
			fn(control_index);
		}
	},
	respond_to_mousedown: function(event){
		if(fractals.state.rendering.rendering){
			return;
		}
		var control_clicked = false;
		fractals.for_each_control(function(control_index){
			if(event.offsetX * fractals.configuration.image.sample_pixel_ratio > fractals.controls[control_index].position.x()){
				if(event.offsetX * fractals.configuration.image.sample_pixel_ratio < fractals.controls[control_index].position.x() + fractals.controls[control_index].size.x()){
					if(event.offsetY * fractals.configuration.image.sample_pixel_ratio > fractals.controls[control_index].position.y()){
						if(event.offsetY * fractals.configuration.image.sample_pixel_ratio < fractals.controls[control_index].position.y() + fractals.controls[control_index].size.y()){
							fractals.controls[control_index].respond_to_click();
							control_clicked = true;
						}
					}
				}
			}
		});
		if(control_clicked){
			return;
		}
		fractals.state.panning.panning = true;
		fractals.state.panning.x_naught = event.offsetX;
		fractals.state.panning.y_naught = event.offsetY;
	},
	respond_to_mousemove: function(event){
		if(fractals.state.rendering.rendering){
			return;
		}
		if(fractals.state.panning.panning){
			fractals.state.panning.offset_x = event.offsetX - fractals.state.panning.x_naught;
			fractals.state.panning.offset_y = event.offsetY - fractals.state.panning.y_naught;
			fractals.render();
		}
	},
	respond_to_mouseup: function(event){
		if(fractals.state.rendering.rendering){
			return;
		}
		if(fractals.state.panning.panning){
			fractals.state.panning.offset_x = event.offsetX - fractals.state.panning.x_naught;
			fractals.state.panning.offset_y = event.offsetY - fractals.state.panning.y_naught;
			fractals.state.center.r -= fractals.state.panning.offset_x * fractals.configuration.image.sample_pixel_ratio * fractals.state.unit_pixel_ratio;
			fractals.state.center.i += fractals.state.panning.offset_y * fractals.configuration.image.sample_pixel_ratio * fractals.state.unit_pixel_ratio;
			fractals.start_render();
			return;
		}
	},
	start_render: function(){
		if(fractals.state.rendering.rendering){
			return;
		}
		fractals.state.rendering.rendering = true;
		fractals.for_each_quadrant(function(quadrant_x, quadrant_y){
			fractals.state.rendering.number_workers_working++;
			fractals.references.workers[quadrant_x][quadrant_y].postMessage({
				type: "RENDER",
				top_left_r: fractals.state.center.r - (1 - quadrant_x) * fractals.references.canvas.width / 2 * fractals.state.unit_pixel_ratio,
				top_left_i: fractals.state.center.i + (1 - quadrant_y) * fractals.references.canvas.height / 2 * fractals.state.unit_pixel_ratio,
				unit_pixel_ratio: fractals.state.unit_pixel_ratio
			});
		});
		fractals.state.rendering.progress_rotation = 0;
		fractals.state.rendering.progress_timeout = setTimeout(fractals.advance_progress, 10);
	},
	advance_progress: function(){
		fractals.references.context.save();
		fractals.references.context.translate(2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height / 2 + fractals.references.canvas.width - (2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height + 2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height), 2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height + 2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height / 2);
		fractals.references.context.rotate(fractals.state.rendering.progress_rotation * Math.PI / 180);
		fractals.references.context.drawImage(
			fractals.state.rendering.progress_image,
			-2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height / 2,
			-2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height / 2,
			2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height,
			2 * fractals.configuration.user_interface.control_spacing * fractals.references.canvas.height
		);
		fractals.references.context.restore();
		fractals.state.rendering.progress_rotation += 10;
		fractals.state.rendering.progress_timeout = setTimeout(fractals.advance_progress, 10);
	},
	render: function(){
		fractals.references.context.clearRect(0, 0, fractals.references.canvas.width, fractals.references.canvas.height);
		fractals.for_each_quadrant(function(quadrant_x, quadrant_y){
			fractals.references.context.putImageData(
				fractals.references.image_data[quadrant_x][quadrant_y],
				fractals.references.canvas.width / 2 * quadrant_x + (fractals.state.panning.panning ? fractals.state.panning.offset_x * fractals.configuration.image.sample_pixel_ratio: 0),
				fractals.references.canvas.height / 2 * quadrant_y + (fractals.state.panning.panning ? fractals.state.panning.offset_y * fractals.configuration.image.sample_pixel_ratio: 0)
			);
		});
		fractals.for_each_control(function(control_index){
			fractals.references.context.drawImage(
				fractals.controls[control_index].image,
				fractals.controls[control_index].position.x(),
				fractals.controls[control_index].position.y(),
				fractals.controls[control_index].size.x(),
				fractals.controls[control_index].size.y()
			);
		});
	},
	respond_to_message: function(message){
		fractals.references.image_data[message.data.quadrant_x][message.data.quadrant_y] = new ImageData(new Uint8ClampedArray(message.data.buffer), fractals.references.canvas.width / 2, fractals.references.canvas.height / 2);
		fractals.state.rendering.number_workers_working--;
		if(fractals.state.rendering.number_workers_working == 0){
			clearTimeout(fractals.state.rendering.progress_timeout);
			fractals.state.rendering.rendering = false;
			fractals.state.panning.panning = false;
			fractals.state.panning.offset_x = 0;
			fractals.state.panning.offset_y = 0;
			fractals.state.zooming.zooming = false;
			fractals.state.zooming.factor = 1;
			fractals.render();
		}
	}
}