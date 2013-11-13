(function (win, doc) {
        var dom = {
            create: function (tagName, t) {
                return doc['create' + (t ? 'TextNode' : 'Element')](tagName);
            },
            query: function (str) {
                return doc.querySelectorAll(str);
            }
        },
        extend = function (target, source) {
            var p;
            for (p in source)
                target[p] = source[p];
            return target;
        },
        copyToClipboard = function (text) {
            var area = dom.create('textarea');
            area.value = text;
            doc.body.appendChild(area);
            area.unselectable = "off";
            area.focus();
            area.select();
            doc.execCommand("Copy");
            doc.body.removeChild(area);
        },
        toSlug = function (str) {
            if (str == "") return str;
            if (typeof (str) != "string") {
                throw new Error("toSlug(): First arg must be a valid String. =>" + str);
            }

            str = str.replace(/^\s+|\s+$/g, ''); // trim
            str = str.toLowerCase();
            // remove accents, swap ñ for n, etc
            var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
            var to = "aaaaeeeeiiiioooouuuunc------";
            for (var i = 0, l = from.length; i < l; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); // collapse dashes
            return str;
        };

       

    Drop64 = function (target, options) {
        var p;
        target = typeof target === 'object' ?
            target : dom.query(target)[0];
        this.options = {};
        for (p in options)
            this.options[p] = options[p];
        this.el = dom.create('div');
        this.el.classList.add('drop64');
        this.dom = {};
        this.dom.main = dom.create('div');
        this.dom.main.classList.add('drop64-main');
        this.dom.content = dom.create('div');
        this.dom.content.classList.add('drop64-content');
        this.dom.btnClear = dom.create('a');
        this.dom.btnClear.classList.add('drop64-btn-clear');
        this.dom.btnClear.appendChild(dom.create('Clean', 1));
        this.dom.btnClear.addEventListener('click', function (e) {
            e.preventDefault();
            this.clear();
        }.bind(this));
        this.fileList = new Drop64.FileList(this.options.rules);
        this.dom.content.appendChild(this.fileList.el);
        this.dom.content.appendChild(this.dom.btnClear);
        this.dom.main.appendChild(this.dom.content);
        this.el.appendChild(this.dom.main);
        target.appendChild(this.el);
    };

    Drop64.prototype = {
        constructor: Drop64,
        clear: function () {
            return this.fileList.clear();
        }
    };

    Drop64.media = [
        ['b64', 'html', 'css'],
        ['b64', 'html'],
        ['b64', 'css'],
        ['b64']
    ];

    Drop64.mimeMap = {
        'image/jpeg': Drop64.media[0],
        'image/jpg': Drop64.media[0],
        'image/gif': Drop64.media[0],
        'image/png': Drop64.media[0],
        'image/svg+xml': Drop64.media[0],
        'image/x-icon': Drop64.media[0],
        'audio/mpeg': Drop64.media[1],
        'audio/mp3':Drop64.media[1],
        'application/ogg':Drop64.media[1],
        'video/mp4':Drop64.media[1],
        'application/font-woff':Drop64.media[2],
        'font/opentype':Drop64.media[2],
        'text/html':Drop64.media[1],
        'text/plain':Drop64.media[1],
        'text/css':Drop64.media[1],
        'text/javascript':Drop64.media[1],
        'application/xml':Drop64.media[3],
        'application/json':Drop64.media[1]
    };
    
    Drop64.accepts = Object.keys(Drop64.mimeMap);

    Drop64.id = 0;

    Drop64.FileList = function (options) {
        this.options = {
            maxSize: 1024
        };
        var events = ['dragenter', 'dragover', 'dragend', 'drop', 'dragleave'];
        for (p in options)
            this.options[p] = options[p];
        this.files = [];
        this.el = dom.create('ul');
        this.el.classList.add('drop64-files');
        for (p in events)
            this.el.addEventListener(events[p], this, false);
    };

    Drop64.FileList.prototype = {

        constructor: Drop64.FileList,

        handleEvent: function (e) {
            e.preventDefault();
            e.stopPropagation();
            switch (e.type) {
            case 'dragenter':
                this.el.classList.add('drop64-files-over');
                break;
            case 'dragleave':
            case 'dragend':
                this.el.classList.remove('drop64-files-over');
                break;
            case 'drop':
                this.el.classList.remove('drop64-files-over');
                this._drop(e);
                break;
            }
        },

        _isFileValid: function(file){
            return Drop64.accepts.indexOf(file.type) > -1 && file.size / 1024 < this.options.maxSize;
        },

        _drop: function (e) {
            var i, files = e.dataTransfer.files;
            [].forEach.call(files, function (file, i) {
                if (this._isFileValid(file))
                    this.addFile(new Drop64.File(file));
            }.bind(this));
        },

        addFile: function (file) {
            this.files.push(file);
            this.el.appendChild(file.el);
            file.convert();
        },

        clear: function () {
            if (!this.files.length)
                return null;
            if (this._thereFilesWorking())
                return confirm("Some files are working now, continue?") ?
                    this._delAllFiles() : null;
            else
                return this._delAllFiles();
        },

        _thereFilesWorking: function () {
            var working = true,
                f;
            for (f in this.files)
                working = working && this.files[f].isWorking;
            return working;
        },

        _delAllFiles: function () {
            var i;
            for (i in this.files)
                this.files[i].remove();
            this.files = [];
        }
    };    

    Drop64.CopyBar = function (file) {
        var i, btn;
        this.file = file;
        this.notifyId;
        this.el = dom.create('div');
        this.el.classList.add('drop64-copy-bar');
        this.dom = {};
        this.dom.label = dom.create('span');
        this.dom.label.appendChild(dom.create('Copy:', 1));
        this.el.appendChild(this.dom.label);
        this.buttons = Drop64.mimeMap[Drop64.accepts[Drop64.accepts.indexOf(this.file.type)]];
        
        for (i in this.buttons) {
            btn = dom.create('button');
            btn.innerHTML = this.buttons[i];
            btn.value = this.buttons[i];
            btn.className = 'drop64-btn-copy drop64-btn-copy-' + this.buttons[i];
            this.el.appendChild(btn);
        };
        this.el.addEventListener('click', function (e) {
            this.copy(e.target.value);
        }.bind(this));
    };

    extend(Drop64.CopyBar.prototype, {
        
        copy: function (media) {
            var data = '', 
                type = this.file.type,
                b64 = this.file.b64;
            switch (media) {
                case 'css':
                    var splits = this.file.name.match(/^([^\\]*)\.(\w+)$/),
                        name = splits[1],
                        ext = splits[2];

                    if ( /image/.test(type) ) {
                        data = '.'+toSlug(name)+' {\n\tbackground-image: url(' + b64 + ');\n}';
                    } else if (/font/.test(type)) {
                        data = '@font-face {\n\tfont-family: "'+ name+'";\n\tsrc: url('+ b64 +') format('+ext+');\n\tfont-weight: "normal|bold|italic";\n\tfont-style: "normal|bold|italic";\n}';
                    };
                    break;
                case 'html':
                    if ( /image/.test(type) ) {
                        data = '<img src="' + b64 + '" />';
                    } else if (/audio/.test(type)) {
                        data = '<audio><source src="'+b64+'" type="'+type+'"></audio>';
                    } else if (/video/.test(type)) { 
                        data = '<video><source src="'+b64+'" type="'+type+'"></video>';
                    } else if (/text\/html/.test(type)) {
                        data = '<iframe src="' + b64 + '" /></iframe>';
                    } else if (/text\/plain/.test(type)) {
                        data = '<textarea value="' + b64 + '" /></textarea>';
                    } else if (/text\/css/.test(type)) {
                        data = '<link rel="stylesheet" href="'+b64+'" type="text/css" media="screen" />';
                    } else if (/javascript|json/.test(type)){
                        data = '<script src="' + b64 + '" /></script>';
                    }
                    break;
                case 'b64':
                    data = this.file.b64;
                    break;
            }
            
            copyToClipboard(data);
            
            chrome && chrome.notifications && chrome.notifications.create && 
                chrome.notifications.create("id" + Drop64.id++, {
                type: 'basic',
                title: 'Drop64',
                message: type.toUpperCase() + ' copy done!\n' + data.substr(0, 25) + '..',
                iconUrl: 'drop64-128.png'
            }, function (id) {
                setTimeout(function(){
                    chrome.notifications.clear(id, function(){});
                }, 2800);
            });
        }
    });

    Drop64.File = function (file) {
        this.file = file;
        this.type = file.type;
        this.name = file.name;
        this.isReady = false;
        this.isWorking = false;
        this.el = dom.create('li');
        this.el.classList.add('drop64-file');
        this.copyBar = null;
        this.dom = {};
        this.dom.progress = dom.create('div');
        this.dom.progressLine = dom.create('span');
        this.dom.progress.classList.add('drop64-file-progress');
        this.dom.progress.appendChild(this.dom.progressLine);
        this.el.appendChild(dom.create(this.file.name.toLowerCase(), 1));
        this.el.appendChild(this.dom.progress);
    };

    extend(Drop64.File.prototype, {

        _onLoadEnd: function (e) {
            this.file.b64 = e.target.result;
            this.copyBar = new Drop64.CopyBar(this.file);
            this.el.appendChild(this.copyBar.el);
            this._ready();
            this._hideProgress();
        },

        _onProgress: function (e) {
            if (e.lengthComputable)
                this.dom.progressLine.style.width = Math.ceil(e.loaded / e.total) * 100 + '%';
        },

        _ready: function () {
            this.isWorking = false;
            this.isReady = true;
            this.el.classList.add('drop64-file-ready');
        },

        _showProgress: function () {
            this.dom.progress.style.display = 'block';
        },

        _hideProgress: function () {
            this.dom.progress.style.display = 'none';
        },

        remove: function () {
            if (this.el.parentNode)
                this.el.parentNode.removeChild(this.el);
        },
        
        convert: function () {
            this.isWorking = true;
            var reader = new FileReader();
            reader.addEventListener('loadend', this._onLoadEnd.bind(this));
            reader.addEventListener('progress', this._onProgress.bind(this));
            this._showProgress();
            reader.readAsDataURL(this.file);
        }
    });

}(window, window.document));

document.addEventListener('mouseenter', function () {
    if ( chrome && chrome.app && chrome.app.window )
        chrome.app.window.current().focus(); 
});
document.addEventListener('DOMContentLoaded', function () {
    new Drop64(document.body);
});