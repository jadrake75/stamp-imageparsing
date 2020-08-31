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

/**
 * Since Firefox does not mark the localStorage as writeable we need to overload it with a mock if we want to spy on it.
 * @see https://github.com/jasmine/jasmine/issues/299
 *
 */
var mockedLocaleStorage = (function () {
    var store = {};

    return {
        getItem: function (key) {
            return store[key];
        },
        setItem: function (key, value) {
            store[key] = value.toString();
        },
        removeItem: function (key) {
            delete store[key];
        },
        clear: function () {
            store = {};
        },
        foo: 'hello'
    };
})();

Object.defineProperty(window, 'localStorage', {
    value:        mockedLocaleStorage,
    configurable: true,
    enumerable:   true,
    writable:     true
});
