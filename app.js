(function (window, document) {
    var dom = {
        create: function (tagName, t) {
            return document['create' + (t ? 'TextNode': 'Element')](tagName);
        },
        query: function (str) {
            return document.querySelectorAll(str);
        }
    },
    extend = function(target, source){
        var p;
        for(p in source)
            target[p] = source[p];
        return target;
    };
    Drop64 = function (target, options) {
        var p;
        target = typeof target === 'object' ? 
            target : dom.query(target);
        this.options = {};
        for (p in options)
            this.options[p] = options[p];
        this.el = dom.create('div');
        this.el.classList.add('drop64');
        this._content = dom.create('div');
        this._content.classList.add('drop64-content');
        this.fileList = new Drop64.FileList(extend(this.options.rules || {}, {
            onAddFile: function(file){
                file.el.addEventListener('click', function(){
                    if (file.isReady) {
                        this.showReport(file.b64);
                    } else {
                        alert("Wait a moment, file in progress.")
                    }
                }.bind(this), false);
            }.bind(this)
        }));
        this._btnClear = dom.create('a');
        this._btnClear.classList.add('drop64-btn-clear');
        this._btnClear.appendChild(dom.create('Clean', 1));
        this._btnClear.addEventListener('click', function(e){
            e.preventDefault(); 
            this.clear();
        }.bind(this));
        this._content.appendChild(this.fileList.el);
        this._content.appendChild(this._btnClear);
        var sel = function(){ 
            this.focus();
            this.select() 
        };
        this._report = dom.create('div');
        this._report.classList.add('drop64-report');
        this._reportContent = dom.create('div');
        this._reportContent.classList.add('drop64-report-content');
        this._htmlTitle = dom.create('h3');
        this._htmlTitle.appendChild(dom.create("HTML",1))
        this._htmlText = dom.create('textarea');
        this._htmlText.readonly = true;
        this._cssTitle = dom.create('h3');
        this._cssTitle.appendChild(dom.create("CSS",1))
        this._cssText = dom.create('textarea');
        this._cssText.readonly = true;
        this._cssText.addEventListener('click', sel);
        this._htmlText.addEventListener('click', sel);
        this._btnBack = dom.create('a');
        this._btnBack.classList.add('drop64-btn-back');
        this._btnBack.appendChild(dom.create('Back', 1));
        this._reportContent.appendChild(this._cssTitle);
        this._reportContent.appendChild(this._cssText);
        this._reportContent.appendChild(this._htmlTitle);
        this._reportContent.appendChild(this._htmlText);
        this._report.appendChild(this._reportContent);
        this._report.appendChild(this._btnBack);
        this._btnBack.addEventListener('click', function(){
            this.el.classList.remove('drop64-flip');
        }.bind(this));
        this.el.appendChild(this._content);
        this.el.appendChild(this._report);
        target.appendChild(this.el);
    };

    Drop64.prototype = {
        constructor: Drop64,
        clear: function(){
            return this.fileList.clear();
        },
        showReport: function(b64){
            this._populate(b64);
            this.el.classList.add('drop64-flip');            
        },
        back: function(){
            this.el.classList.remove('drop64-flip');
        },
        _populate: function(b64){
           this._cssText.value = '.class { \n background-image: url('+ b64 +');\n}';
           this._htmlText.value = '<img src="'+ b64 +'"/>';
        }
    };


    Drop64.FileList = function (options) {
        var p;
        this.options = {
            maxSize: 1000,
            accepts: [
                'image/jpeg',
                'image/jpg',
                'image/gif',
                'image/png', 
                'image/svg+xml', 
                'text/css', 
                'text/javascript', 
                'application/font-woff'
            ]
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

        _drop: function (e) {
            var i, files = e.dataTransfer.files;
            [].forEach.call(files, function (file, i) {
                if (this.options.accepts.indexOf(file.type) > -1 && file.size / 1024  < this.options.maxSize )
                    this.addFile(new Drop64.File(file));
            }.bind(this));
            window.focus();
        },

        addFile: function (file) {
            this.files.push(file);
            this.el.appendChild(file.el);
            file.convert();
            if (this.options.onAddFile)
                this.options.onAddFile.call(this, file);
        },

        clear: function () {
            if (!this.files.length)
                return null;
            if (this._thereFilesWorking()) 
                return confirm("Some files are working now, continue?")? 
                    this._delAllFiles() : null;
            else 
                return this._delAllFiles();
        },

        _thereFilesWorking: function () {
            var working = true, f;
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

    Drop64.File = function (file) {
        this.file = file;
        this.type = file.type;
        this.name = file.name;
        this.b64 = null;
        this.isWorking = false;
        
        this.el = dom.create('li');
        this.el.classList.add('drop64-file');

        this._progress = dom.create('div');
        this._progressLine = dom.create('span');
        this._progress.classList.add('drop64-file-progress');
        this._progress.appendChild(this._progressLine)
        
        this.el.appendChild(dom.create(this.file.name.toLowerCase(), 1));
        this.el.appendChild(this._progress);
    };

    Drop64.File.prototype = {

        constructor: Drop64.File,
        
        convert: function () {
            this.isWorking = true;
            var reader = new FileReader();
            reader.addEventListener('loadend', this._onLoadEnd.bind(this));
            reader.addEventListener('progress', this._onProgress.bind(this));
            this._showProgress();
            reader.readAsDataURL(this.file);
        },
        
        _onLoadEnd: function(e){
            this.b64 = e.target.result;
            this._ready();            
            this._hideProgress();
        },

        _onProgress: function(e){ 
            if (e.lengthComputable)
                this._progressLine.style.width = Math.ceil(e.loaded / e.total) * 100 + '%';
        },

        _ready: function(){
            this.isWorking = false;
            this.isReady = true;
            this.el.classList.add('drop64-file-ready');
        },
        
        _showProgress: function(){
            this._progress.style.display = 'block';
        },
        
        _hideProgress: function(){
            this._progress.style.display = 'none';
        },
        
        remove: function(){
            if (this.el.parentNode)
                this.el.parentNode.removeChild(this.el);
        }
    };

}(window, window.document));

document.addEventListener('DOMContentLoaded', function(){
    drop64 = new Drop64(document.body);
});