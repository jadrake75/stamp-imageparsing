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
import {remote} from 'electron';

export class FileManager {

    constructor() {
        this.folderHandler = remote.require('./platform/file-utilities');
    }

    /**
     * Returns an array of folder information at a given path.  The results are {name|path}
     * @param path
     * @returns {*|Array}
     */
    getFolders(path) {
        return this.folderHandler.getFolders(path);
    }

    /**
     * Determine if the path exists.
     *
     * @param path
     * @returns {*}
     */
    exists(path) {
        return this.folderHandler.exists(path);
    }

    /**
     * Retrieve the platform path separator
     *
     * @returns {"\" | "/"}
     */
    getPathSeparator() {
        return this.folderHandler.getPathSeparator();
    }
}
