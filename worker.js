onmessage = function(message){
	console.log("fractals worker starting render");
	var fractals = message.data;
	var image_data_array = new Uint8ClampedArray(fractals.render_width * fractals.render_height * 4);
	var c_r, z_r_copy, z_r, z_i, i, z_r_squared, z_i_squared;
	var pixel_index = 0;
	var c_r_start = fractals.c_r_start - fractals.unit_pixel_ratio;
	var c_i = fractals.c_i_start + fractals.unit_pixel_ratio;
	var escape_radius_squared = fractals.escape_radius * fractals.escape_radius;
	var maximum_recursions_squared = fractals.maximum_recursions * fractals.maximum_recursions;
	for(var y = 0; y < fractals.render_height; y++){
		c_i -= fractals.unit_pixel_ratio;
		c_r = c_r_start;
		for(var x = 0; x < fractals.render_width; x++){
			c_r += fractals.unit_pixel_ratio;
			z_r = c_r;
			z_i = c_i;
			z_r_squared = z_r * z_r;
			z_i_squared = z_i * z_i;
			i = 0;
			while(z_r_squared + z_i_squared < escape_radius_squared && i < fractals.maximum_recursions){
				z_r_copy = z_r;
				z_r = z_r_squared - z_i_squared + c_r;
				z_i = 2 * z_r_copy * z_i + c_i;
				z_r_squared = z_r * z_r;
				z_i_squared = z_i * z_i;
				i++;
			}
			if(i == fractals.maximum_recursions){
				image_data_array[pixel_index] = 20;
				pixel_index++;
				image_data_array[pixel_index] = 10;
				pixel_index++;
				image_data_array[pixel_index] = 0;
				pixel_index++;
			}else{
				image_data_array[pixel_index] = i * i / maximum_recursions_squared * 255;
				pixel_index++;
				image_data_array[pixel_index] = i * i / maximum_recursions_squared * 102;
				pixel_index++;
				image_data_array[pixel_index] = i * i / maximum_recursions_squared * 0;
				pixel_index++;
			}
			image_data_array[pixel_index] = 255;
			pixel_index++;
		}
	}
	postMessage([image_data_array, fractals]);
	console.log("fractals worker finished render");
}