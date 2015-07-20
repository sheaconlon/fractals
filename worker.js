var data = {
	quadrant_x: null,
	quadrant_y: null,
	escape_radius_squared: null,
	recursion_limit: null
}
onmessage = function(message){
	switch(message.data.type){
		case "INITIALIZE":
			data.quadrant_x = message.data.quadrant_x;
			data.quadrant_y = message.data.quadrant_y;
			data.escape_radius_squared = message.data.escape_radius * message.data.escape_radius;
			data.recursion_limit = message.data.recursion_limit;
			break;
		case "SET_SIZE":
			data.width = message.data.width;
			data.height = message.data.height;
			break;
		case "RENDER":
			var buffer = new ArrayBuffer(data.width * data.height * 4);
			var image_data_array = new Uint8ClampedArray(buffer);
			var image_data_index = 0;
			var recursions;
			var recursion_ratio;
			var c = {};
			var z = {};
			c.i = message.data.top_left_i;
			for(var pixel_y = 0; pixel_y < data.height; pixel_y++){
				c.r = message.data.top_left_r;
				for(var pixel_x = 0; pixel_x < data.width; pixel_x++){
					z.r = c.r;
					z.i = c.i;
					z.rsq = z.r * z.r;
					z.isq = z.i * z.i;
					recursions = 0;
					//hrow [z.rsq + z.isq, data.escape_radius_squared, recursions, data.recursion_limit];
					while(z.rsq + z.isq < data.escape_radius_squared && recursions < data.recursion_limit){
						z.r2 = z.r;
						z.r = z.rsq - z.isq + c.r;
						z.i = 2 * z.r2 * z.i + c.i;
						z.rsq = z.r * z.r;
						z.isq = z.i * z.i;
						recursions++;
					}
					if(recursions == data.recursion_limit){
						image_data_array[image_data_index] = 254;
						image_data_index++;
						image_data_array[image_data_index] = 254;
						image_data_index++;
						image_data_array[image_data_index] = 254;
						image_data_index++;
						image_data_array[image_data_index] = 254;
						image_data_index++;
					}else{
						recursion_ratio = Math.sqrt(Math.sqrt(recursions / data.recursion_limit));
						image_data_array[image_data_index] = recursion_ratio * 212 + (1 - recursion_ratio) * 254;
						image_data_index++;
						image_data_array[image_data_index] = recursion_ratio * 70 + (1 - recursion_ratio) * 254;
						image_data_index++;
						image_data_array[image_data_index] = recursion_ratio * 0 + (1 - recursion_ratio) * 254;
						image_data_index++;
						image_data_array[image_data_index] = 254;
						image_data_index++;
					}

					c.r += message.data.unit_pixel_ratio;
				}
				c.i -= message.data.unit_pixel_ratio;
			}
			postMessage({
				buffer: image_data_array.buffer, 
				quadrant_x: data.quadrant_x,
				quadrant_y: data.quadrant_y
			}, [image_data_array.buffer]);
	}
}