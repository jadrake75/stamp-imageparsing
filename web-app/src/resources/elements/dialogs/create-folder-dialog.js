/*
 Copyright 2020 Jason Drake (jadrake75@gmail.com)

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
import {DialogController} from 'aurelia-dialog';
import {observable} from 'aurelia-framework';

import _ from 'lodash';

export class CreateFolderDialog {

    static inject = [DialogController];

    @observable folderName = '';
    hasFocus = false;

    constructor(controller){
        this.controller = controller;
    }

    attached() {
        this.hasFocus = true;
    }

    folderNameChanged() {
        this.hasFocus = this.hasFocus || _.isEmpty(this.folderName);
    }
}
