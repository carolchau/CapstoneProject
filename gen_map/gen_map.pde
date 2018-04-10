PImage grass, path, sand, stone, water, snow, swamp, jungle;

void setup() {
  size(720,720);
  loadPixels();
  grass = loadImage("Grass.png");
  path = loadImage("Path.png");
  sand = loadImage("Sand.png");
  stone = loadImage("Stone.png");
  water = loadImage("Water.png");
  snow = loadImage("Snow.png");
  swamp = loadImage("Swamp.png");
  jungle = loadImage("Jungle.png");
  
  if (args == null) {
    println("Usage: $processing-java --sketch=gen_map --run argu moisture-freq moisture-pow temp-freq temp-pow sweetness-freq sweetness-pow");
    return;
  }
  
  // create 3 500x500 Perlin noise maps
  String[] moisture = genNoise(float(args[1]), float(args[2]));
  noiseSeed(int(random(-1000, 1000)));
  String[] temperature = genNoise(float(args[3]), float(args[4]));
  noiseSeed(int(random(-1000, 1000)));
  String[] sweetness = genNoise(float(args[5]), float(args[6]));
  
  // overlaps in noise maps dictate biomes
  for (int i = 0; i < moisture.length; i++) {
    String[] moist_row = split(moisture[i], ' ');
    String[] temp_row = split(temperature[i], ' ');
    String[] sweet_row = split(sweetness[i], ' ');
    for (int j = 0; j < moist_row.length; j++) {
      float moist = float(moist_row[j]);
      float temp = float(temp_row[j]);
      float sweet = float(sweet_row[j]);
      // desert
      if (moist < 102 && temp > 153) {
        pixels[i*width + j] = color(255,255,0);
      }
      // dessert
      else if (moist > 153 && temp < 102 && sweet > 100) {
        pixels[i*width + j] = color(255,0,255);
      }
      // snow
      else if (moist > 153 && temp < 102) {
        pixels[i*width + j] = color(255,255,255);
      }
      // jungle
      else if (moist > 153 && temp > 102 && sweet > 100) {
        pixels[i*width + j] = color(0,255,255);
      }
      // swamp
      else if (moist > 153 && temp > 102) {
        pixels[i*width + j] = color(0,0,0);
      }
      // grass
      else {
        pixels[i*width + j] = color(0,255,0);
      }
    }
  }
  updatePixels();
}

void draw(){
  
  //checks the colour of the pixel beneath it and places a matching 16x16 block 
  for ( int y = 0; y < height; y += 16) {
    for ( int x = 0; x < width; x += 16) { 
     color c = get(y, x);
     // stone
     if (c==color(255,255,0)) {
        image(stone,y,x);
      }
      // dessert
      else if (c==color(255,0,255)) {
       image(sand,y,x);
      }
      // snow
      else if (c==color(255,255,255)) {
        image(snow,y,x);
      }
      // jungle
      else if (c==color(0,255,255)) {
        image(jungle,y,x);
      }
      // swamp
      else if (c==color(0,0,0)) {
        image(swamp,y,x);
      }
      // grass
      else if(c==color(0,255,0)) {
        image(grass,y,x);
      }
    }
  }
}

// Generates a widthxheight noisemap
// @frequency: the noise frequence
// @power: noise redistribution (higher highs and lower lows)
// Returns generated noisemap as a list of strings, each string being a row
// of pixel values
String[] genNoise(float frequency, float power) {
  float yoff = 0.0;
  String[] pixel_vals = {};
  for (int y = 0; y < height; y++) {
    float xoff = 0.0;
    String row = "";
    for (int x = 0; x < width; x++) {
      float bright = noise(frequency*xoff,frequency*yoff);
      bright = map(pow(bright,power),0,1,0,255);
      row += str(bright);
      if (x < width - 1) row += " ";
      xoff += 0.01;
    }
    yoff += 0.01;
    pixel_vals = append(pixel_vals, row);
  }
  return pixel_vals;
}
