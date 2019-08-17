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
import {customElement, inject, computedFrom, bindable} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {Router} from 'aurelia-router';

@customElement('welcome-panel')
@inject(Element, I18N, Router)
export class WelcomePanel {


    cardActions = [
        {
            id: 'open-image',
            label: 'Open Image',
            icon: 'assets/svg/photo.svg',
            route: 'image-manage'
        },
        {
            id: 'start-image-processor',
            label: 'Start Image Processor',
            icon: 'assets/svg/process.svg'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: 'assets/svg/settings.svg'
        },
        {
            id: 'retrieve-uuid',
            label: 'Generate Application Key',
            icon: 'assets/svg/app-key.svg'
        }
    ]

    constructor(element, i18n, router) {
        this.element = element;
        this.i18n = i18n;
        this.router = router;
    }

    handleAction(action) {
        switch(action.id) {
            case 'open-image':
                this.router.navigate(action.route);
                break;
        }
    }

}
