onmessage = function(message){
	var fractals = message.data;
	var image_data_array = new Uint8ClampedArray(fractals.render_width * fractals.render_height * 4);
	var c_r, z_r_copy, z_r, z_i, i, z_r_squared, z_i_squared, squares_ratio, squares_ratio_complement;
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
				image_data_array[pixel_index] = 10;
				pixel_index++;
				image_data_array[pixel_index] = 5;
				pixel_index++;
				image_data_array[pixel_index] = 1;
				pixel_index++;
			}else{
				recursion_ratio = i / fractals.maximum_recursions
				recursion_ratio_complement = 1 - recursion_ratio
				image_data_array[pixel_index] = 235 * recursion_ratio + 255 * recursion_ratio_complement;
				pixel_index++;
				image_data_array[pixel_index] = 126 * recursion_ratio + 255 * recursion_ratio_complement;
				pixel_index++;
				image_data_array[pixel_index] = 16 * recursion_ratio + 255 * recursion_ratio_complement;
				pixel_index++;
			}
			image_data_array[pixel_index] = 255;
			pixel_index++;
		}
	}
	postMessage([image_data_array, fractals]);
}