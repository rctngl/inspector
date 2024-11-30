
function start() {
    
    const connectBut = document.getElementById("connectButton")

    connectBut.addEventListener("click", BLEManager);

}

async function BLEManager() {

    // Search and Pair Device

    const device = await navigator.bluetooth.requestDevice({
        filters: [
            {name: "F3000FC"}
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

    let value = event.target.value;

    const bitWidths = [21, 4, 3, 3, 1, 8, 8, 7, 3, 5, 1];
    const results = extractBits(value, bitWidths);

    console.log(results);
    
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