
function start() {
    
    const connectBut = document.getElementById("connectButton")

    connectBut.addEventListener("click", BLEManager);

}

function setVal(val) {
    document.getElementById("val").innerHTML = val
}

function setState(state) {
    document.getElementById("state").innerHTML = state
}

function setDecimal(val) {
    document.getElementById("decimal").innerHTML = val
}

function setMagnitude(val) {
    document.getElementById("magnitude").innerHTML = val
}

function setSign(val) {
    document.getElementById("sign").innerHTML = val
}

function setUnit(unit) {
    document.getElementById("unit").innerHTML = unit
}

function setFunction(val) {
    document.getElementById("function").innerHTML = val
}

function setRange(val) {
    document.getElementById("range").innerHTML = val
}

function setDecade(val) {
    document.getElementById("decade").innerHTML = val
}

function setAttribute(val) {
    document.getElementById("attr").innerHTML = val
}

async function BLEManager() {

    // Search and Pair Device

    const device = await navigator.bluetooth.requestDevice({
        filters: [
            { services: ["b6981800-7562-11e2-b50d-00163e46f8fe"] }
        ],
        optionalServices: [
            "0000180a-0000-1000-8000-00805f9b34fb",
            "b6981800-7562-11e2-b50d-00163e46f8fe"
        ]
    })

    // Connect Device

    try {
        const connected = await device.gatt.connect()
        console.log("Connected")

        getServices(connected)
    }
    catch {
        console.log("Unable to connect")
    }



}


async function getServices(device) {

    const decoder = new TextDecoder()

    console.log("Getting Device Info Service")
    const deviceInfoService = await device.getPrimaryService("0000180a-0000-1000-8000-00805f9b34fb")
    
    const modelChar = await deviceInfoService.getCharacteristic("00002a24-0000-1000-8000-00805f9b34fb")
    const model = await modelChar.readValue();
    console.log(decoder.decode(model))

    const brandChar = await deviceInfoService.getCharacteristic("00002a29-0000-1000-8000-00805f9b34fb")
    const brand = await brandChar.readValue()
    console.log(decoder.decode(brand))

    const measureService = await device.getPrimaryService("b6981800-7562-11e2-b50d-00163e46f8fe")
    const valChar = await measureService.getCharacteristic("b698290f-7562-11e2-b50d-00163e46f8fe")
    
    valChar.startNotifications().then(_ => {
        valChar.addEventListener('characteristicvaluechanged', handleNotifications)
        console.log("Notifications Setup")
    })


    //
    //const val = await valChar.readValue()

    // console.log(valChar)

}

function handleNotifications(event) {

    let dataView = event.target.value;

    /*

        0: Value
        1: Reading State
        2: Decimal Places
        3: Magnitude
        4: Sign (or zero)
        5: Unit
        6: Function
        7: Value Range
        8: Range Decade?
        9: Attribute

    */

    const bitWidths = [21, 4, 3, 3, 1, 8, 8, 7, 3, 5, 1];
    // const results = extractBits(value, bitWidths);
    const results = extractBitsFromDataView(dataView, bitWidths);

    // console.log(results);
    
    // 1
    setState(getState(results[1]))

    // 2
    setDecimal(results[2])

    // 3 
    const magnitude = getMagnitude(results[3])
    setMagnitude(magnitude[1])

    // 4
    setSign(results[4])

    // 5
    setUnit(getUnit(results[5]))
    
    // 6
    setFunction(getFunc(results[6]))

    // 7
    setRange(results[7])

    // 8
    setDecade(getRangeDecade(results[8]))

    // 9
    setAttribute(getAttribute(results[9]))

    const decimalPlaces = results[2]
    const exponent = magnitude[0]

    const pow = Math.pow(10.0, exponent - decimalPlaces)
    const scaled = results[0] * pow

    var display = scaled

    if (results[4] == 1) {
        display = -scaled
    }

    setVal(display)
    
}

function extractBits(byteArray, bitWidths) {
    let bitIndex = 0; // Tracks the current bit position
    const results = [];

    // Convert the byte array to a single binary string
    const binaryString = Array.from(byteArray)
        .map(byte => byte.toString(2).padStart(8, '0')) // Convert each byte to 8-bit binary
        .join('');

    for (const width of bitWidths) {
        // Extract the specified number of bits
        const bits = binaryString.substr(bitIndex, width);
        results.push(parseInt(bits, 2)); // Convert binary to integer
        bitIndex += width; // Move to the next bit segment
    }

    return results;
}

function extractBitsFromDataView(dataView, bitWidths) {
    let bitIndex = 0; // Tracks the current bit position
    const results = [];

    for (const width of bitWidths) {
        let value = 0; // Accumulator for the extracted value
        let bitsToExtract = width; // Number of bits left to extract

        while (bitsToExtract > 0) {
            const byteIndex = Math.floor(bitIndex / 8); // Which byte to read
            const bitOffset = bitIndex % 8; // Bit position within the byte
            const availableBits = 8 - bitOffset; // Bits left in the current byte
            const extractBits = Math.min(availableBits, bitsToExtract); // Number of bits to extract now

            // Read the byte and mask the needed bits
            const byte = dataView.getUint8(byteIndex);
            const maskedBits = (byte >> bitOffset) & ((1 << extractBits) - 1);

            // Add the extracted bits to the accumulated value
            value |= maskedBits << (width - bitsToExtract);

            // Update indices and remaining bits to extract
            bitsToExtract -= extractBits;
            bitIndex += extractBits;
        }

        results.push(value);
    }

    return results;
}

function getState(int) {

    switch (int) {
        case 0:
            return "normal"
        case 1:
            return "blank"
        case 2:
            return "inactive"
        case 3:
            return "----"
        case 4:
            return "OL"
        case 5:
            return "OL"
        case 6:
            return "Open TC"
        case 7:
            return "Discharge"
        case 8:
            return "Leads"
        case 9:
            return "greater than"
        case 10:
            return "missing phase"
        case 11:
            return "error"
        case 12:
            return "less than"
        case 13:
            return "empty"
        default:
            return int
    }

}

function getMagnitude(int) {

    // [exponent, string]

    switch (int) {

        case 0: 
            return [0, ""]
        case 1: 
            return [9, "G"]
        case 2: 
            return [6, "M"]
        case 3: 
            return [3, "k"]
        case 4: 
            return [-3, "m"]
        case 5: 
            return [-6, "µ"]
        case 6: 
            return [-9, "n"]
        case 7: 
            return [-12, "p"]
        default: 
            return [int, "?"]

    }

} 

function getUnit(int) {

    switch(int) {
        case 0:
            return "None"
        case 1:
            return "VAC"
        case 2:
            return "VDC"
        case 3:
            return "AAC"
        case 4:
            return "ADC"
        case 5:
            return "Hz"
        case 11:
            return "&ohm;"
        case 15:
            return "F"
        case 36:
            return "VAC/Hz"
        default:
            return int
    }

}

function getFunc(int) {

    switch (int) {
        case 0:
            return "none"
        case 1:
            return "mVAC"
        case 2:
            return "VAC"
        case 11:
            return "mVDC"
        case 12:
            return "VDC"
        case 13:
            return "mAAC"
        case 20:
            return "mADC"
        case 27:
            return "Hz VDC"
        case 23:
            return "Hz VAC"
        case 29:
            return "Hz mAAC"
        case 39:
            return "cont"
        case 40:
            return "&ohm;"
        case 46:
            return "diode"
        default:
            return int;
    }
    
}

function getRangeDecade(int) {

    switch (int) {
        case 0: 
            return [0, "none"]
        case 1: 
            return [1, "tens"]
        case 2: 
            return [2, "hundreds"]
        case 3: 
            return [3, "thousands"]
        case 5: 
            return [-3, "milli"]
        case 6: 
            return [-2, "centi"]
        case 7: 
            return [-1, "deci"]
        default:
            return [int, "?"]
    }

}

function getAttribute(int) {

    switch (int) {
        case 0: 
            return "none"
        case 1: 
            return "open circuit"
        case 2: 
            return "short circuit"
        case 3: 
            return "glitch circuit"
        case 4: 
            return "good diode"
        case 5: 
            return "negative edge"
        case 6: 
            return "positive edge"
        case 7: 
            return "high current"
        case 8: 
            return "hazardous voltage indicator"
        case 9: 
            return "low ohms"
        case 10: 
            return "open glitch circuit"
        case 11: 
            return "short glitch circuit"
        case 12: 
            return "peak"
        case 13: 
            return "sourced"
        case 14: 
            return "simulated"
        case 15: 
            return "noise"
        case 16: 
            return "Breakdown"
        default:
            return "Unknown"
    }

}
