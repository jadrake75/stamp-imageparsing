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
import {customElement, inject} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {ServerConfig} from "manager/server-config";
import {IdentityHelper} from 'util/identity-helper';
import {AltPaths} from "../../../manager/alt-paths";

@customElement('system-settings')
@inject(Element, I18N, ServerConfig, AltPaths)
export class SystemSettings {

    port = -1;
    hostname;
    applicationKey;
    altPath = [];

    constructor(element, i18n, serverConfig, altPathConfig) {
        this.element = element;
        this.i18n = i18n;
        this.serverConfig = serverConfig;
        this.altPathConfig = altPathConfig;
    }

    activate() {
        this.initialize();
    }

    initialize() {
        this.hostname = this.serverConfig.getHostname();
        this.port = this.serverConfig.getPort();
        this.applicationKey = this.serverConfig.getApplicationKey();
        this.serverConfig.reset();

        this.altPath = this.altPathConfig.getPaths();
    }

    save() {
        this.serverConfig.setPort(this.port);
        this.serverConfig.setHostname(this.hostname);
        this.serverConfig.setApplicationKey(this.applicationKey);
        this.serverConfig.save();

        this.altPathConfig.setPaths(this.altPath);
        this.altPathConfig.save();
    }

    generateSecurityKey() {
        this.applicationKey = IdentityHelper.generateUUIDKey();
    }
}
