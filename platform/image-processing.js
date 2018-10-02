/*
 Copyright 2018 Jason Drake (jadrake75@gmail.com)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
const java = require('java');
const path = require('path');
const jimp = require('jimp');
const sharp = require('sharp');
const _ = require('lodash');
const fs = require('fs');


java.classpath.push('dist/stamp-imageparsing.jar');
java.classpath.push('dist/lib/ij.jar');

java.options.push('-Djava.util.logging.config.file=dist/logging.properties');

module.exports = function () {
    "use strict";

    let imageProcessor;

    let calcPixelPerMillimeter = function(dpi) {
        return dpi * 0.3937;
    }

    return {

        getImageProcessor: function () {
            if (imageProcessor) {
                return imageProcessor;
            }
            try {
                java.asyncOptions = {
                    asyncSuffix:   "",
                    syncSuffix:    "Sync",
                    promiseSuffix: "Promise",
                    promisify:     require("when/node").lift
                };
                java.import('com.drakeserver.processing.ImageProcessor');
                imageProcessor = java.newInstancePromise("com.drakeserver.processing.ImageProcessor");
                return imageProcessor;
            } catch (e) {
                throw new Error(e);
            }
        },

        /**
         * Allows for the setting of additional java options via the command processor
         *
         * eg. '-Xmx2048m'
         *
         * @param options
         */
        setJavaOptions: function (options) {
            java.options.push(options);
        },

        process: function (dataArray, options) {
            let q = new Promise((resolve, reject) => {
                let imageProcessor = this.getImageProcessor();
                let t = (new Date()).getTime();
                let byteArray = java.newArray('byte', _.flatten(dataArray));
                console.log('time to flatten: ', (new Date().getTime() - t), 'ms');
                let javaOptions = java.newInstanceSync('java.util.Properties');
                // javaOptions.setPropertySync('minimumInterceptingArea', '0.25');

                let lastMsg;
                setInterval(() => {
                    let msg = javaOptions.getPropertySync('msg');
                    if (lastMsg !== msg) {
                        console.log(msg);
                        lastMsg = msg;
                    }
                }, 150);

                imageProcessor.then(ip => {
                    ip.processPromise(byteArray, javaOptions).then(result => {
                        resolve(result);
                    });
                });

            });
            return q;
        },


        saveImages: function (outputFolder, data, region, options = {}) {
            let mimeType = options.mimeType || jimp.MIME_JPEG;
            let q = new Promise((resolve, reject) => {
                /*jimp.read(data).then(img => {
                    let rect = region.rectangle;
                    let newImg = img.crop(rect.x, rect.y, rect.width, rect.height);
                    if (mimeType === jimp.MIME_JPEG) {
                        newImg.quality(98); // jpeg only
                    }
                    newImg.getBufferAsync(mimeType).then(buf => {
                        fs.writeFileSync(path.join(__dirname, region.filename + '.jpg'), buf);
                        resolve();
                    });
                }).catch(e => {
                    reject(e);
                });*/
                let img = new sharp(data).withMetadata();
                let rect = region.rectangle;
                img = img.extract({left: rect.x, top: rect.y, width: rect.width, height: rect.height});
                switch(mimeType) {
                    case 'image/tiff':
                        img = this.processTIFF(img, options);
                        break;
                    case 'image/jpeg':
                        img = this.processJPEG(img, options);
                        break;
                    case 'image/png':
                        img = this.procesPNG(img, options);
                        break;
                }
                img.toBuffer().then(buf => {
                    fs.writeFileSync(path.join((outputFolder || __dirname), region.filename), buf);
                    resolve();
                });

            });
            return q;
        },

        processTIFF(image, options = {}) {
            let tiffOptions = {};
            if(_.has(options, 'dpi.dpiHorizontal')) {
                _.set(tiffOptions, 'xres', +_.get(options, 'dpi.dpiHorizontal'));
            }
            if(_.has(options, 'dpi.dpiVertical')) {
                _.set(tiffOptions, 'yres', +_.get(options, 'dpi.dpiVertical'));
            }
            return image.tiff(tiffOptions);
        },

        processJPEG(image, options = {}) {
            let jpegOptions = {};
            _.set(jpegOptions, 'quality', +_.get(options, 'jpeg.quality', 85));
            return image.jpeg(jpegOptions);
        },

        procesPNG(image, options = {}) {
            return image.png();
        }

    };

}();
