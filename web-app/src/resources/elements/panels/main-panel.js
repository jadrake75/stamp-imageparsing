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

import {customElement, computedFrom, inject, bindable, observable, LogManager} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {I18N} from 'aurelia-i18n';
import {Router} from 'aurelia-router';
import {changeDpiBlob} from 'changedpi';
import {FileManager} from 'manager/file-manager';
import {ImageHandler} from 'processing/image/image-handler';
import {ImageBounds} from 'model/image-bounds';
import {DefaultOptions, EventNames, StorageKeys, ImageTypes, KeyCodes, ChannelNames} from 'util/constants';
import _ from 'lodash';
import {ConnectionManager} from 'manager/connection-manager';

const ZOOM_IN = 1;
const ZOOM_OUT = -1;

const MAX_ZOOM = 4.0;
const MIN_ZOOM = 0.125;

@customElement('main-panel')
@inject(Element, I18N, Router, ImageHandler, EventAggregator, FileManager, ConnectionManager)
export class MainPanel {

    @observable boxes = [];
    @bindable boundRegions = [];
    @bindable selectedRegion;

    toobig = false;
    toosmall = false;

    scalingFactor = 1.0;
    image;
    data;
    meta;
    handler;
    outputPath;
    processing = false;
    folders = [];

    showSettings = false;
    fileInputName = 'file-input-name';
    connected = false;
    subscribers = [];
    memoryStats = [];


    constructor(element, i18n, router, imageHandler, eventAggregator, fileManager, connectionManager) {
        this.element = element;
        this.i18n = i18n;
        this.router = router;
        this.handler = imageHandler;
        this.eventAggregator = eventAggregator;
        this.logger = LogManager.getLogger('main-panel');
        this.fileManager = fileManager;
        this.connectionManager = connectionManager;

        this.fileSelected = this._fileSelected.bind(this);
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
            this._handleFolderSelected(folder);
        }

        this._startPing();
    }

    detached() {
        $(this.element).off('keydown');
        _.forEach(this.subscribers, sub => {
            sub.dispose();
        });
    }

    home() {
        this.router.navigateToRoute('welcome');
    }

    _startPing() {
        let f = () => {
            this.connected = this.connectionManager.isConnected();
            _.delay(f, 2000);
        }
        f();
    }

    _setupListeners() {
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SELECTION_CHANGED, this._handleSelectionChange.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.NEW_REGION, this._handleNewRegion.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SAVE_REGIONS, this._handleSaveRegions.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.SAVE_SETTINGS, this._handleSaveSettings.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.FOLDER_SELECTED, this._handleFolderSelected.bind(this)));
        this.subscribers.push(this.eventAggregator.subscribe(EventNames.ZOOM, this.zoom.bind(this)));
        this.connectionManager.addSubscriber(ChannelNames.MEMORY_STATS, this._handleMemoryStats.bind(this));
        $(this.element).on('keydown', this._handleKeydown.bind(this));
    }

    _handleMemoryStats(response) {
        let stats = JSON.parse(_.get(response, 'body', "{}"));
        let freeMemory = _.get(stats, 'freeMemory', -1) * 1.0;
        let totalMemory = _.get(stats, 'totalMemory', -1) * 1.0;
        let used = freeMemory / totalMemory;
        let data = _.takeRight(this.memoryStats, 9);
        data.push(used);
        this.memoryStats = data;
    }

    _handleKeydown(event) {
        if (event.ctrlKey) {
            if (this.image) {
                switch(event.keyCode) {
                    case KeyCodes.DEL:
                        let curIndex = this.getSelectedIndex();
                        this.deleteSelected();
                        if (!_.isEmpty(this.boundRegions)) {
                            this.selectedRegion = this.boundRegions[curIndex];
                        }
                        break;
                    case KeyCodes.NUMPAD_ADD:
                        this.zoom(ZOOM_IN);
                        break;
                    case KeyCodes.NUMPAD_SUBTRACT:
                        this.zoom(ZOOM_OUT);
                        break;
                    case KeyCodes.KEY_N:
                        this.addRegion();
                        break;
                    case KeyCodes.Key_P:
                        this.process();
                        break;
                }
            }
            if(event.keyCode === KeyCodes.KEY_O) {
                this.eventAggregator.publish(EventNames.FILE_OPEN, this.fileInputName);
            }
        }

    }

    _handleSaveSettings(settings) {
        this.options = _.merge(this.options, settings);
        localStorage.setItem(StorageKeys.OPTIONS, JSON.stringify(this.options));
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

    _handleFolderSelected(folderName) {
        this.outputPath = folderName;
        this.folders = this.fileManager.getFolders(this.outputPath);
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
        _.set(region, 'imageType', _.get(this.options, 'image.defaultType', _.first(ImageTypes)));
    }

    _fileSelected(chosenFile) {
        if (_.size(chosenFile) > 0) {
            let f = _.first(chosenFile);
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
                this.handler.readImage(b).then(([result, dataURI]) => {
                    this.data = result.data;
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
        } else {
            this.clear();
            this.image = undefined;
            this.data = undefined;
        }
    }

    @computedFrom('boundRegions.length')
    get showSidePanel() {
        return this.boundRegions.length > 0;
    }

    addRegion() {
        this.eventAggregator.publish(EventNames.ADD_REGION);
    }

    deleteSelected() {
        let index = this.getSelectedIndex();
        if (index >= 0) {
            this.boundRegions.splice(index, 1);
            this.eventAggregator.publish('delete-selected', this.selectedRegion);
            this.selectedRegion = undefined;
        }
    }

    getSelectedIndex() {
        return _.findIndex(this.boundRegions, o => { return o === this.selectedRegion});
    }

    clear() {
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
            this.scalingFactor = Math.min(this.scalingFactor / 0.5, MAX_ZOOM);
        } else {
            this.scalingFactor = Math.max(this.scalingFactor * 0.5, MIN_ZOOM);
        }
        if (this.scalingFactor <= this._MIN_ZOOM) {
            this.toosmall = true;
        } else if (this.scalingFactor >= MAX_ZOOM) {
            this.toobig = true;
        }
    }

    settings() {
        this.showSettings = !this.showSettings;
    }

    @computedFrom('showSettings', 'showSidePanel')
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

    process() {
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
