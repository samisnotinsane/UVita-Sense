console.log("Build 1.5");
// global sensor vars
var u = 0; // UV sensor reading
var t = 0; // temperature sensor reading
var l = 0; // light sensor reading

// lcd disp. colours
var r,g,b;
    r = 25;
    g = 25;
    b = 25;

var TExp = 0; // time to sunburn

// temp sensor stuff
var mraa = require('mraa');
var B = 3975; // const. for temp sensor

//GROVE Kit A0 Connector --> Aio(0)
var tempAnalogPin = new mraa.Aio(0); // for temp sensor
// for temp sensor; sends reading to cloud analytics
var dgram = require('dgram');
var client = dgram.createSocket('udp4');

// UDP Options
var options = {
    host : '127.0.0.1',
    port : 41234
};

function sendObservation(name, value, on){
    var msg = JSON.stringify({
        n: name,
        v: value,
        on: on
    });

    var sentMsg = new Buffer(msg);
    console.log("Sending observation: " + sentMsg);
    client.send(sentMsg, 0, sentMsg.length, options.port, options.host);
}

function readTempSensorValue() {
    'use strict';
     var a = tempAnalogPin.read();
     console.log("Analog Pin (A0) Output: " + a);
     //console.log("Checking....");
     var resistance = (1023 - a) * 10000 / a; //get the resistance of the sensor;
     //console.log("Resistance: "+resistance);
     var celsius_temperature = 1 / (Math.log(resistance / 10000) / B + 1 / 298.15) - 273.15;//convert to temperature via datasheet ;
     console.log("Celsius Temperature "+celsius_temperature);  
     sendObservation("temp", celsius_temperature, new Date().getTime());
     var tt = parseFloat(celsius_temperature);
     t = roundNum(tt, 0);
     setLcdMessage(u,t);
}

// UV sensor stuff
var UVSensor = require('jsupm_guvas12d');
// Instantiate a UV sensor on analog pin A0
var myUVSensor = new UVSensor.GUVAS12D(1);

// analog voltage, usually 3.3 or 5.0
var g_GUVAS12D_AREF = 5.0;
var g_SAMPLES_PER_QUERY = 1024;

function readUvSensorValue() {
    var outputStr = "AREF: " + g_GUVAS12D_AREF + ", Voltage value (higher means more UV): " + roundNum(myUVSensor.value(g_GUVAS12D_AREF, g_SAMPLES_PER_QUERY), 6);
	console.log(outputStr);
    
    var Vsig = roundNum(myUVSensor.value(g_GUVAS12D_AREF, g_SAMPLES_PER_QUERY), 6);
    var illInt = (307*Vsig);
    var uvIndex = roundNum(((illInt/200)*10), 0);
    
    sendObservation("ultravio", uvIndex, new Date().getTime());
    u = uvIndex;
    setLcdMessage(u,t);
}

function roundNum(num, decimalPlaces)
{
	var extraNum = (1 / (Math.pow(10, decimalPlaces) * 1000));
	return (Math.round((num + extraNum) * (Math.pow(10, decimalPlaces))) / Math.pow(10, decimalPlaces));
}

// light sensor stuff
var groveSensor = require('jsupm_grove');
//var UVSensor = require('jsupm_guvas12d');
// Create the light sensor object using AIO pin 2
var light = new groveSensor.GroveLight(2);

// Read the input and print both the raw value and a rough lux value,
function readLightSensorValue() {
    console.log(light.name() + " raw value is " + light.raw_value() +
            ", which is roughly " + light.value() + " lux");
    sendObservation("lights", light.value(), new Date().getTime());
    l = parseFloat(light.value());
    setLcdMessage(u,t);
}

// LCD stuff
var LCD = require('jsupm_i2clcd');
// Initialize Jhd1313m1 at 0x62 (RGB_ADDRESS) and 0x3E (LCD_ADDRESS) 
var myLcd = new LCD.Jhd1313m1 (0, 0x3E, 0x62);
var lineOne = "UVita Sense";
var lineTwo = "Debug mode...";

// LED stuff
var redlightio = new mraa.Gpio(2); // red LED
var greenlightio = new mraa.Gpio(3); // green LED
redlightio.dir(mraa.DIR_OUT); //set the gpio direction to output
greenlightio.dir(mraa.DIR_OUT);

// if param true then turn light on; else turn off   
function ledswitchred(ledState) {
    redlightio.write(ledState?1:0);
    ledState = !ledState;
}

function ledswitchgreen(ledState) {
    greenlightio.write(ledState?1:0);
    ledState = !ledState;
}

function setLcdTitle(title) {
    myLcd.setCursor(0,0);
    myLcd.write(title);
    //myLcd.scroll(true);
}

function setLcdMessage(uv, tem) {
    myLcd.setCursor(1,0);
    myLcd.setColor(r,g,b);
   setTimeout(function() {
       if(r<256 || g<256 || b<256) {
//        r =  r/light.value();
//        g = g/light.value();
//        b = b/light.value();
       }
        myLcd.setColor(r, g, b);
        myLcd.setCursor(1,0);
        myLcd.write(TExp + "Mins" + " UV:" + uv + " "+ tem + "C");
    }, 60000);
    myLcd.setCursor(1,0);
    myLcd.write(TExp + "Mins" + " UV:" + uv + " "+ tem + "C");
}

function uvSafeCheck() {
      // LED control
      var lState = true; //Boolean to hold the state of Led
      // high UV; switch on red led
      if(u > 8) {
            ledswitchred(lState); 
      } else {
            ledswitchgreen(lState);
      }  
}

// LCD control
setLcdTitle(lineOne);
//setLcdMessage(lineTwo);

//function screenScroller() {
//    myLcd.setCursor(1,1);
//    myLcd.scroll(false);
//    
//}

function timeDecrement() {
       TExp ++;
}

// monitor sensor data and send them to the cloud while timer hasn't expired

    //var tempScroller = setInterval(screenScroller, 350);
    var tempLight = setInterval(readLightSensorValue, 1000); // get light sensor reading every second
    var tempUv = setInterval(readUvSensorValue, 1025); // get UV sensor reading 
    var tempSafeChk = setInterval(uvSafeCheck, 1500);
    var tempTemperature = setInterval(readTempSensorValue, 1050); // get temperature sensor reading 
    setInterval(timeDecrement, 60000); // decrement after each min

// end app after timer expires - turn off LEDs and exit
//greenlightio.write(0);
//redlightio.write(0);