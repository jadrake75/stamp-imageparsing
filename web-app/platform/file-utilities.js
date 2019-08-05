/*
 Copyright 2019 Jason Drake (jadrake75@gmail.com)

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

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

let folderUtilities = function () {
    "use strict";

    return {
        isDirectory: source => {
            return fs.lstatSync(source).isDirectory();
        },

        /**
         * Retrieve the folders of a source path
         *
         * @param source
         * @param includeInternalDir - whether to return folders starting with '.' (default is false)
         * @returns {Array}
         */
        getFolders: (source, includeInternalDir = false) => {
            let output = [];
            let folders = fs.readdirSync(source)
                .filter(name => (includeInternalDir) ? name: !name.startsWith('.'))
                .map(name => path.join(source, name))
                .filter(folderUtilities.isDirectory);
            _.forEach(folders, f => {
                output.push({
                    name: path.basename(f),
                    path: f
                });
            });
            return output;
        }
    }
}();

module.exports = folderUtilities;