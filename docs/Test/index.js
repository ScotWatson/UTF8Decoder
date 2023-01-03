/*
(c) 2023 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();

const asyncWindow = new Promise(function (resolve, reject) {
  window.addEventListener("load", function (evt) {
    resolve(evt);
  });
});

const asyncErrorLog = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/Test/ErrorLog.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTypes = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/Test/Types.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncStreams = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Streams/Test/Streams.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncUnicode = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Unicode/Test/Unicode.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTasks = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Tasks/Test/Tasks.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncMemory = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Memory/Test/Memory.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncSequence = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Containers/Test/Sequence.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncEncoding = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Unicode/Test/Encoding.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

(async function () {
  try {
    const modules = await Promise.all( [ asyncWindow, asyncErrorLog, asyncTypes, asyncStreams, asyncUnicode, asyncTasks, asyncMemory, asyncSequence, asyncEncoding ] );
    start(modules);
  } catch (e) {
    console.error(e);
  }
})();


async function start( [ evtWindow, ErrorLog, Types, Streams, Unicode, Tasks, Memory, Sequence, Encoding ] ) {
  try {
    const imgBird = document.createElement("img");
    imgBird.src = "FlappingBird.gif";
    imgBird.style.width = "100px";
    document.body.appendChild(imgBird);
    let p1 = document.createElement("p");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    p1.appendChild(fileInput);
    document.body.appendChild(p1);
    let p2 = document.createElement("p");
    p2.appendChild(document.createTextNode("Byte Rate: "));
    const inpByteRate = document.createElement("input");
    inpByteRate.type = "number";
    p2.appendChild(inpByteRate);
    p2.appendChild(document.createTextNode(" bytes"));
    document.body.appendChild(p2);
    let p3 = document.createElement("p");
    p3.appendChild(document.createTextNode("Usage: "));
    const inpUsage = document.createElement("input");
    inpUsage.type = "number";
    p3.appendChild(inpUsage);
    p3.appendChild(document.createTextNode("%"));
    document.body.appendChild(p3);
    let p4 = document.createElement("p");
    document.body.appendChild(p4);

    const outputByteSequence = new Sequence.ByteSequence();
    const utf8Encoder = new Streams.PassiveNodeToByte({
      transform: Encoding.utf8Encode,
      outputByteRate: 5,
    });
    utf8Encoder.connectOutput(outputByteSequence.inputCallback);
    const utf8Decoder = new Streams.PassiveNode({
      transform: Encoding.utf8Decode,
    });
    utf8Decoder.connectOutput(utf8Encoder.inputCallback);
    const doneCallback = new Tasks.Callback({
      invoke: function () {
        console.log("utf8Encoder flushed");
        const outputView = outputByteSequence.createView();
        const outputBlob = new self.Blob( [ outputView.toUint8Array() ] );
        const outputURL = URL.createObjectURL(outputBlob);
        const a = document.createElement("a");
        a.display = "none";
        a.href = outputURL;
        a.download = "output.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log("done");
      }
    });

    utf8Decoder.flushedSignal.add(new Tasks.Callback({
      invoke: function () {
        console.log("utf8Decoder flushed");
        utf8Encoder.flush();
      },
    }));
    utf8Encoder.flushedSignal.add(doneCallback);

    fileInput.addEventListener("input", function (evt) {
      const byteRate = parseInt(inpByteRate.value);
      const usage = parseInt(inpUsage.value) / 100;
      const file = evt.target.files[0];
      const fileChunkSource = new Streams.createBlobChunkSource({
        blob: file,
        outputByteRate: byteRate,
      });
      const fileChunkPushSourceNode = new Streams.AsyncPushSourceNode({
        asyncSource: fileChunkSource,
        targetUsage: usage,
        smoothingFactor: 0.1,
        progressThreshold: 1,
      });
      fileChunkPushSourceNode.connectOutput(utf8Decoder.inputCallback);
      const usageBar = document.createElement("progress");
      usageBar.setAttribute("max", "100");
      document.body.appendChild(usageBar);
      const statInterval = self.setInterval(function () {
        const avgRunTime = fileChunkPushSourceNode.avgRunTime;
        const avgInterval = fileChunkPushSourceNode.avgInterval;
        const usagePercent = ((avgRunTime / avgInterval) * 100);
        p4.innerHTML = "";
        const p4_1 = document.createElement("p");
        p4_1.innerHTML = "Avg Run Time: " + avgRunTime.toFixed(2) + " ms";
        p4.appendChild(p4_1);
        const p4_2 = document.createElement("p");
        p4_2.innerHTML = "Avg Interval: " + avgInterval.toFixed(2) + " ms";
        p4.appendChild(p4_2);
        const p4_3 = document.createElement("p");
        p4_3.innerHTML = "Usage: " + usagePercent.toFixed(0) + "%";
        p4.appendChild(p4_3);
        usageBar.setAttribute("value", usagePercent);
      }, 150);
      fileChunkPushSourceNode.endedSignal.add(new Tasks.Callback({
        invoke: function () {
          console.log("eof");
          self.clearInterval(statInterval);
          utf8Decoder.flush();
        },
      }));
      const progressBar = document.createElement("progress");
      progressBar.setAttribute("max", "100");
      document.body.appendChild(progressBar);
      let bytesRead = 0;
      fileChunkPushSourceNode.progressSignal.add(new Tasks.Callback({
        invoke: function () {
          bytesRead += byteRate;
          console.log(bytesRead);
          progressBar.setAttribute("value", (bytesRead / file.size) * 100);
        },
      }));
    });
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
