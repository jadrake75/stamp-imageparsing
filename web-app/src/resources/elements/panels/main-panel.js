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

import {customElement, computedFrom, inject, bindable, observable, LogManager, BindingEngine} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {I18N} from 'aurelia-i18n';
import {changeDpiDataUrl, changeDpiBlob} from 'changedpi';
import {ImageHandler} from 'processing/image/image-handler';
import {MessageManager} from 'manager/message-manager';
import {FileManager} from 'manager/file-manager';
import {ImageBounds} from 'model/image-bounds';
import {DefaultOptions, EventNames, StorageKeys, ImageTypes} from 'util/constants';
import _ from 'lodash';
import {ConnectionService} from "processing/connection-service";

@customElement('main-panel')
@inject(Element, I18N, ImageHandler, EventAggregator, BindingEngine, MessageManager, FileManager, ConnectionService)
export class MainPanel {

    @observable boxes = [];
    @bindable boundRegions = [];
    @bindable selectedRegion;

    toobig = false;
    toosmall = false;

    scalingFactor = 1.0;
    image;
    data;
    chosenFile;
    chosenFolder;
    meta;
    handler;
    outputPath;
    processing = false;
    folders = [];

    showSettings = false;
    connected = false;
    subscribers = [];

    _MAX_ZOOM = 4.0;
    _MIN_ZOOM = 0.125;

    constructor(element, i18n, imageHandler, eventAggregator, bindingEngine, messageManager, fileManager, connectionService) {
        this.element = element;
        this.i18n = i18n;
        this.handler = imageHandler;
        this.eventAggregator = eventAggregator;
        this.bindingEngine = bindingEngine;
        this.logger = LogManager.getLogger('main-panel');
        this.messageManager = messageManager;
        this.fileManager = fileManager;
        this.connectionService = connectionService;
    }

    attached() {
        this._setupListeners();
        this.options = _.assign({}, DefaultOptions);
        let opts = localStorage.getItem(StorageKeys.OPTIONS);
        if (!_.isNil(opts)) {
            this.options = _.assign(this.options, JSON.parse(opts));
        }
        let folder = localStorage.getItem(StorageKeys.OUTPUT_PATH);
        if (!_.isNil(folder)) {
            this.outputPath = folder;
        }
        this._startPing();
    }

    detached() {
        _.forEach(this.subscribers, sub => {
            sub.dispose();
        });
        this.messageManager.dispose();
    }

    _startPing() {
        let f = () => {
            this.connectionService.isAlive().then(result => {
               this.connected = true;
                _.delay(f, 10000);
            }).catch(err => {
                this.connected = false;
                _.delay(f, 3000);
            });
        }
        f();
    }

    _setupListeners() {
        this.subscribers.push(this.eventAggregator.subscribe('canvas-click', this._handleCanvasClick.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SELECTION_CHANGED, this._handleSelectionChange.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.NEW_REGION, this._handleNewRegion.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SAVE_REGIONS, this._handleSaveRegions.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SAVE_SETTINGS, this._handleSaveSettings.bind(this)));

      //  this.subscribers.push(this.bindingEngine.collectionObserver(this.boxes).subscribe(this.boxesChanged.bind(this)));
        this.subscribers.push(this.bindingEngine.propertyObserver(this, 'outputPath').subscribe(this._handleOutputPath.bind(this)));
    }

    _handleSaveSettings(settings) {
        this.options = _.merge(this.options, settings);
        localStorage.setItem(StorageKeys.OPTIONS, JSON.stringify(this.options));
    }

    _handleCanvasClick(clickData) {
        console.log(">>> ", clickData.x, ' and ', clickData.y);
    }

    _handleNewRegion(boundImage) {
        this._initializeRegion(boundImage);
        this.boundRegions.push(boundImage);
        this.selectedRegion = boundImage;
    }

    _handleSelectionChange(region) {
        this.selectedRegion = region;
    }

    _handleSaveRegions(regions) {
        this.handler.saveRegions(this.data, regions, this.options, this.inputFile);
    }

    boxesChanged() {
        this.selectedRegion = undefined;
        _.defer(() => {
            _.forEach(this.boxes, (box, index) => {
                let region = new ImageBounds({
                    rectangle: box
                });
                this._initializeRegion(region);
                this.boundRegions.push(region);
                if (index === 0) {
                    this.selectedRegion = region;
                }
            });
        });
    }

    _initializeRegion(region) {
        _.set(region, 'imageType', _.get(this.options, 'image.defaultType', ImageTypes[0]));
    }

    _handleOutputPath(newPath) {
        this.folders = this.fileManager.getFolders(newPath);
    }

    folderSelected() {
        if(this.chosenFolder.length > 0) {
            let dir = this.chosenFolder[0];
            localStorage.setItem(StorageKeys.OUTPUT_PATH, dir.path);
            this.outputPath = dir.path;

        }
    }

    fileSelected() {
        if (this.chosenFile.length > 0) {
            let f = this.chosenFile[0];
            this.processing = true;
            this.eventAggregator.publish(EventNames.STATUS_MESSAGE, {
                message: this.i18n.tr('messages.loading'),
                showBusy: true
            });
            this.meta = {
                name:         f.name,
                originalSize: f.size,
                mimeType:     f.type
            };
            this.clear();
            let fn = (b) => {
                this.handler.readImage(b).then((dataURI) => {
                    //this.data = result.data;
                    this.dataURI = dataURI;
                    this.image = this.handler.asObjectUrl(this.handler.dataUrlToBinary(dataURI), this.meta);
                    this.inputFile = f.path;
                    this.processing = false;
                    this.eventAggregator.publish(EventNames.STATUS_MESSAGE, {
                        message:  this.i18n.tr('messages.loading-done'),
                        showBusy: false,
                        dismiss:  true
                    });
                });
            };
            if(this.meta.mimeType === "image/tiff" || _.get(this.options, 'dpi.mode', 'image') === 'image') {
                fn(f);
            } else {
                let dpi = _.get(this.options, 'dpi.horizontal', 300);
                changeDpiBlob(f, dpi).then(b => {
                    fn(b);
                });
            }
        }
    }

    @computedFrom('boundRegions.length')
    get showSidePanel() {
        return this.boundRegions.length > 0;
    }

    addRectangle() {
        this.eventAggregator.publish('add-rectangle');
    }

    deleteSelected() {
        let index = _.findIndex(this.boundRegions, o => { return o === this.selectedRegion});
        if (index >= 0) {
            this.boundRegions.splice(index, 1);
            this.eventAggregator.publish('delete-selected', this.selectedRegion);
            this.selectedRegion = undefined;
        }
    }

    clear() {
        //this.data = undefined;
        this.dataURI = undefined;
        this.clearBoxes();
    }

    clearBoxes() {
        this.boxes = [];
        ImageBounds.lastCount = 0;
        this.boundRegions.splice(0, this.boundRegions.length);
        this.selectedRegion = undefined;
    }

    zoom(factor) {
        this.toobig = false;
        this.toosmall = false;
        if (factor > 0) {
            this.scalingFactor = Math.min(this.scalingFactor / 0.5, this._MAX_ZOOM);
        } else {
            this.scalingFactor = Math.max(this.scalingFactor * 0.5, this._MIN_ZOOM);
        }
        if (this.scalingFactor <= this._MIN_ZOOM) {
            this.toosmall = true;
        } else if (this.scalingFactor >= this._MAX_ZOOM) {
            this.toobig = true;
        }
    }

    settings() {
        this.showSettings = !this.showSettings;
    }

    get imagePanelClassnames() {
        let classNames = '';
        if( this.showSettings ) {
            classNames += ' with-settings-panel';
        }
        if( this.showSidePanel) {
            classNames += ' with-side-panel';
        }
        return classNames;
    }

    process(f) {
        this.processing = true;
        this.clearBoxes();

        _.defer(() => {
            if (this.dataURI || this.inputFile) {
                let asData = !this.inputFile && this.dataURI;
                this.handler.process((asData ? this.dataURI : this.inputFile), this.options, asData).then(info => {
                    this.boxes = info.boxes;
                    this.processing = false;
                }).catch(err => {
                    this.processing = false;
                    this.eventAggregator.publish(EventNames.STATUS_MESSAGE, {
                        message:  this.i18n.tr('messages.processing-failed'),
                        showBusy: false,
                        dismiss:  true
                    });

                });
            }
        });

    }
}
