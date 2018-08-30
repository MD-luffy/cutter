;(function(exports) {
	if (typeof CutterInit !== 'undefined') {
		console.warn('CutterInit已全局存在，这将导致裁剪工具无法正常使用！')
		exports.CutterInit = CutterInit
	} else {
		exports.CutterInit = init
	}

	//变量初始化
	var 
		_srcImg, _cutter, _cLeft, _cRight,	//关键dom节点
		_desWidth = 0,	//目标图片宽度
		_desHeight = 0,	//目标图片高度
		_ratio = 0,		//裁剪区宽高比，经过计算后的比值
		_srcRatio = '', //裁剪图片宽高比，未经过计算的比值(传给后端，避免计算误差)
		_picType = 'png', //目标图片格式
		_zIndex = 99,	//裁剪工具样式z-index值
		_resources = [],	//原始图片集
		_maxWidth = 400,	//原始图片最大展示宽度
		_disWidth = 0,	//裁剪区最小展示宽度
		_disHeight = 0, //裁剪区最小展示高度
		_target = null,	//事件目标
		_currentIndex = 0,	//当前处理的图片索引
		_desImgs = [],	//最终图片urls数组
		_callback = null //裁剪回调

	/**
	 * 裁剪工具初始化
	 * @function CutterInit
	 * @param  {obj} options 配置选项
	 * @param {obj|array} [options.files] 要裁剪的fileList或者file对象数组，可选参数，如：{0: fileObj1, 1: fileObj2}或者[fileObj1, fileObj2]
	 * @param {array} [options.urls] 要裁剪的原始图片urls数组，可选参数，如：['http://a.jpg', 'http://b.jpg']
	 * @param {string} options.ratio 宽高比例，以斜线连接，必传参数，如：'2/1',表示宽高比例为2比1
	 * @param {int} options.width 最终生成的图片宽度，必传参数
	 * @param {int} options.height 最终生成的图片高度，必传参数
	 * @param {string} [options.type=png] 最终生成的图片的格式，可选参数，默认为png格式，支持传值：png或Jpeg
	 * @param {int} [options.zIndex=99] 裁剪工具z-index样式，可选参数，默认为99
	 * @param {function} options.callback 裁剪完成后的回调，必传参数，函数传参为最终图片的urls数组，如：['http://a1.jpg', 'http://b1.jpg']
	 * @return {null}
	 * @version 1.0
	 * @example
	 * 	//引入组件样式及脚本
	 *  <link rel="stylesheet" href="https://static.qtour.com/qboss-cutter/1.0/css/cutter.css">
	 *	<script src="https://static.qtour.com/qboss-cutter/1.0/js/cutter.js"></script>
	 * 	
	 * 	//以urls方式传参			
	 * 	CutterInit({
	 *		urls: ['http://pic.sc.chinaz.com/files/pic/pic9/201208/xpic6813.jpg','http://test.qulv.com:8073/root/2018/05/10/16/01/x3ap4idp.dzl.jpg'],
	 *		ratio: '2/1',
	 *		width: 400,
	 *		height: 200,
	 *		callback: function(data) {
	 *			console.log(data)
	 *		}
	 *	})
	 *	
	 * 	//以files方式传参			
	 * 	CutterInit({
	 *		files: e.target.files,
	 *		ratio: '2/1',
	 *		width: 400,
	 *		height: 200,
	 *		callback: function(data) {
	 *			console.log(data)
	 *		}
	 *	})
	 */
	function init(options)
	{
		if (
			typeof options === 'undefined' ||
			typeof options.ratio === 'undefined' ||
			typeof options.width === 'undefined' ||
			typeof options.height === 'undefined' ||
			typeof options.callback === 'undefined'
		) {
			throw '配置项传参非法，请检查传参！'
		}
		if (typeof options.files === 'undefined' && typeof options.urls === 'undefined') {
			throw 'fileList和urls二传一！'
		}

		_desWidth = options.width
		_desHeight = options.height
		_ratio = _desWidth / _desHeight
		_srcRatio = options.ratio
		_picType = options.type || 'png'
		_zIndex = options.zIndex || 99
		_callback = options.callback
		_currentIndex = 0
		_desImgs = []

		checkPic(options.files || options.urls, function(data) {
			if (typeof data === 'string') {
				alert(data)
			} else {
				render(data[0])
			}
		})
	}

	/*
	 * 渲染裁剪插件
	 */
	function render(src)
	{
		if (document.getElementsByClassName('cutter-tool').length > 0) {
			alert('页面已存在cutter-tool类名的元素，裁剪工具初始化失败！')
			return
		}
		if (document.getElementsByClassName('cutter-mask').length > 0) {
			alert('页面已存在cutter-mask类名的元素，裁剪工具初始化失败！')
			return
		}		
		var html = '<div class="cutter-tool">' +
						'<p>' + 
							'<span>原始大小:<i></i>&nbsp;&nbsp;</span>' + 
							'<span>裁剪大小:<i></i>&nbsp;&nbsp;</span>' + 
							'<span>裁剪比例:<i></i>&nbsp;&nbsp;</span>' + 
							'<span>张数:<i></i></span>' + 
						'</p>' +
						'<div class="work-region">' +
							'<img src="" alt="">' +
							'<div class="cutter">' +
								'<div class="left"></div>' +
								'<div class="top"></div>' +
								'<div class="right"></div>' +
								'<div class="bottom"></div>' +
							'</div>' +			
						'</div>' +
						'<div class="confirm">' +
							'<button>确定</button><button>取消</button>' + 
						'</div>' +
					'</div>' +
					'<div class="cutter-mask"></div>'
		var d = document.createElement('div')
		d.innerHTML = html
		document.body.appendChild(d)

		document.querySelector('.cutter-mask').style['z-index'] = _zIndex
		document.querySelector('.cutter-tool').style['z-index'] = _zIndex + 1
		_srcImg = document.querySelector('.cutter-tool img')
		_cutter = document.querySelector('.cutter-tool .cutter')
		_cLeft = document.querySelector('.cutter-tool .left')
		_cRight = document.querySelector('.cutter-tool .right')

		//设置部分头部文字展示
		document.querySelector('.cutter-tool p span:nth-child(2)').getElementsByTagName('i')[0].innerText = _desWidth + '*' + _desHeight
		document.querySelector('.cutter-tool p span:nth-child(3)').getElementsByTagName('i')[0].innerText = _srcRatio

		loadPicAndInitcutter(src)

		//监听裁剪区鼠标按下事件
		_cutter.addEventListener('mousedown', mousedown)
	}

	/*
	 * 加载原始图片到裁剪区并初始化裁剪框
	 */
	function loadPicAndInitcutter(src) {
		_srcImg.src = typeof src === 'string' ? src : window.URL.createObjectURL(src)
		_srcImg.onload = function() {
			if (this.width > _maxWidth) {
				_srcImg.style.width = _maxWidth + 'px'
			}

			var pos = _srcImg.getBoundingClientRect()
			//根据图片展示区大小设置裁剪区大小
			_cutter.style.top = 0
			_cutter.style.left = 0
			if (this.width / this.height < _desWidth / _desHeight) {
				_cutter.style.width = pos.width + 'px'
				_cutter.style.height = pos.width / _ratio + 'px'
				_disWidth = pos.width * _desWidth / this.naturalWidth
				_disHeight = _disWidth / _ratio
			} else {
				_cutter.style.height = pos.height + 'px'
				_cutter.style.width = pos.height * _ratio + 'px'
				_disHeight = pos.height * _desHeight / this.naturalHeight
				_disWidth = _disHeight * _ratio
			}

			//设置部分头部文字展示
			document.querySelector('.cutter-tool p span:nth-child(1)').getElementsByTagName('i')[0].innerText = _srcImg.naturalWidth + '*' + _srcImg.naturalHeight
			document.querySelector('.cutter-tool p span:nth-child(4)').getElementsByTagName('i')[0].innerText = _currentIndex + 1 + '/' + _resources.length

			//第一次加载图片时绑定裁剪事件
			if (_currentIndex == 0) {
				//点击"确定"
				document.querySelector('.cutter-tool button:nth-child(1)').onclick = function(e) {
					e.preventDefault()
					this.disabled = 'disabled'
					doCut(_resources[_currentIndex++])
				}
				//点击"取消"
				document.querySelector('.cutter-tool button:nth-child(2)').onclick = function(e) {
					e.preventDefault()
					document.body.removeChild(document.querySelector('.cutter-tool').parentNode)
				}
			}
		}
	}

	/*
	 * 调用后台裁剪接口
	 */
	function doCut(file) {
		var data = new FormData()

		var cutPos = _cutter.getBoundingClientRect(),
			imgPos = _srcImg.getBoundingClientRect(),
			left = ((cutPos.left - imgPos.left) * (_srcImg.naturalWidth / imgPos.width)).toFixed(),
			top	= ((cutPos.top - imgPos.top) * (_srcImg.naturalHeight / imgPos.height)).toFixed(),
			width = (cutPos.width * (_srcImg.naturalWidth / imgPos.width)).toFixed()

		typeof file === 'string' ? data.append('urls', file) : data.append('files', file)
		data.append('imageType', _picType)
		//接口接受传参为整数
		data.append('tasks', JSON.stringify([{
			type: "CutRectangle",
            left: left,
            top: top,
            width: width,
            Ratio: _srcRatio
		}, {
            type: "ZoomRectangle",
            Width: _desWidth.toFixed(),
            Height: _desHeight.toFixed()
        }]))


		var xhr = new XMLHttpRequest()
		//把这个url改成要上传的地址，然后确保传参都正确就行
		var url = '//uploadfile.qulv.com/api/uploadimage/qboss?uploadType=1'
		xhr.open('post', url, true)
		xhr.send(data)
		progressUI(true)
		xhr.onreadystatechange = function(resp) {
			progressUI(false)
			if (xhr.status == 200) {
				if (xhr.readyState == 4) {
					var data = JSON.parse(resp.target.response)
					if (_desImgs.push(data[0]) === _resources.length) {
						//所有图片已裁剪完毕，销毁裁剪插件并调用裁剪回调
						document.body.removeChild(document.querySelector('.cutter-tool').parentNode)
						_callback(_desImgs)
					} else {
						//加载下一张待裁剪图片
						document.querySelector('.cutter-tool button:nth-child(1)').removeAttribute('disabled')
						loadPicAndInitcutter(_resources[_currentIndex])
					}
				}
			} else {
				if (xhr.readyState == 4) {
					document.querySelector('.cutter-tool button:nth-child(1)').removeAttribute('disabled')
					alert('裁剪当前图片失败，请重试！')
				}
			}
		}
	}

	/*
	 * 裁剪过程中loading控制
	 */
	function progressUI(show) {
		var html = '<div class="progress">' +
						'<span><img src="progress.gif" alt=""></span>' +
					'</div>'
		var progress = document.querySelector('.cutter-tool .progress')
		if (show) {
			if (!progress) {
				var e = document.createElement('div')
				e.innerHTML = html
				document.querySelector('.cutter-tool .work-region').appendChild(e)
			}
		} else {
			if (progress) {
				document.querySelector('.cutter-tool .work-region').removeChild(progress.parentNode)
			}
		}
	}

	/*
	 * 检测所有待裁剪图片宽高是否合法
	 */
	function checkPic(files, cb) {
		if (!(files instanceof Array)) {
			files = Object.keys(files).map(function(item) {
				return files[item]
			})
		}

		var t = [],
			expFiles = [],
			counts = 1
		for (var i=0; i<files.length; i++) {
			var	src = '',
				img = new Image()

			if (typeof files[i] === 'string') {
				src = files[i]
			} else {
				src = window.URL.createObjectURL(files[i])
				t.push({
					name: files[i].name,
					objUrl: src
				})
			}
			img.src = src
			img.onload = function() {
				var self = this
				if (this.width < _desWidth || this.height < _desHeight) {
					if (/^blob/.test(this.src)) {
						expFiles.push(t.find(function(file) {
							return self.src == file.objUrl
						}).name)
					} else {
						expFiles.push(this.src)
					}
				}
				if (counts++ === files.length) {
					if (expFiles.length > 0) {
						cb('图片：' + expFiles.join(';') + ' 大小非法，将不执行裁剪！')
					} else {
						cb(files)
					}
				}				
			}
			img.onerror = function() {
				cb('加载图片失败！')
			}
		}
		_resources = files
	}

	/*
	 * 鼠标向下点击事件
	 */
	function mousedown(e) {
		_target = e.target
		//阻止默认点击事件(否则鼠标样式的展示会变成禁用的图标)
		e.preventDefault()
		//非裁剪区点击不触发move、up事件
		if (e.target !== _cutter && e.target.parentNode !== _cutter) {
			return
		}
		document.addEventListener('mousemove', mousemove)
		document.addEventListener('mouseup', mouseup)
	}

	/*
	 * 鼠标移动事件
	 */
	function mousemove(e) {
		var
			updateX = true,
			updateY = true,
			imgPos = _srcImg.getBoundingClientRect(),
			cutPos = _cutter.getBoundingClientRect()

		//拖拽裁剪内容区
		if (_target === _cutter) {
			//顶贴边检测
			if (cutPos.top === imgPos.top && e.movementY < 0) {
				if (e.movementX < 0) {
					if (cutPos.left > imgPos.left) {
						updateY = false
					} else {
						return
					}
				} else if (e.movementX > 0) {
					if (cutPos.right < imgPos.right) {
						updateY = false
					} else {
						return
					}
				} else {
					return
				}
			} else if (cutPos.top < imgPos.top) {
				_cutter.style.top = 0
				return
			}
			//左贴边检测
			if (cutPos.left === imgPos.left && e.movementX < 0) {
				if (e.movementY < 0) {
					if (cutPos.top > imgPos.top) {
						updateX = false
					} else {
						return
					}
				} else if (e.movementY > 0) {
					if (cutPos.bottom < imgPos.bottom) {
						updateX = false
					} else {
						return
					}
				} else {
					return
				}		
			} else if (cutPos.left < imgPos.left) {
				_cutter.style.left = 0
				return
			}
			//底贴边检测
			if (cutPos.bottom === imgPos.bottom && e.movementY > 0) {
				if (e.movementX < 0) {
					if (cutPos.left > imgPos.left) {
						updateY = false
					} else {
						return
					}
				} else if (e.movementX > 0) {
					if (cutPos.right < imgPos.right) {
						updateY = false
					} else {
						return
					}
				} else {
					return
				}
			} else if (cutPos.bottom > imgPos.bottom) {
				_cutter.style.top = ''
				_cutter.style.bottom = 0
				return
			}
			//右贴边检测
			if (cutPos.right === imgPos.right && e.movementX > 0) {
				if (e.movementY < 0) {
					if (cutPos.top > imgPos.top) {
						updateX = false
					} else {
						return
					}
				} else if (e.movementY > 0) {
					if (cutPos.bottom < imgPos.bottom) {
						updateX = false
					} else {
						return
					}
				} else {
					return
				}				
			} else if (cutPos.right > imgPos.right) {
				_cutter.style.left = ''
				_cutter.style.right = 0
				return
			}

			if (updateY) {
				var top = (cutPos.top - imgPos.top) + e.movementY
				if (top < 0) {	//控制top范围
					top = 0
				} else if (top > imgPos.bottom - imgPos.top - cutPos.height) {
					top = imgPos.bottom - imgPos.top - cutPos.height
				}
				_cutter.style.top = top + 'px'
				_cutter.style.bottom = ''
			}
			if (updateX) {
				var left = (cutPos.left - imgPos.left) + e.movementX
				if (left < 0) {	//控制left范围
					left = 0
				} else if (left > imgPos.right - imgPos.left - cutPos.width) {
					left = imgPos.right - imgPos.left - cutPos.width
				}
				_cutter.style.left = left + 'px'
				_cutter.style.right = ''
			}				

			return
		}
		//拖拽裁剪区左边线
		if (_target === _cLeft) {
			if (cutPos.left < imgPos.left) {
				_cutter.style.left = 0
				return
			} else if (cutPos.left === imgPos.left && e.movementX < 0) {	//超过左边距且仍向外移动
				return
			} else if (cutPos.top < imgPos.top) {	//移动左边线，上边线联动
				_cutter.style.top = 0
				return
			} else if (cutPos.top === imgPos.top && e.movementX < 0) {
				return
			}
			_cutter.style.left = ''
			_cutter.style.top = ''
			_cutter.style.right = imgPos.right - cutPos.right + 'px'
			_cutter.style.bottom = imgPos.bottom - cutPos.bottom + 'px'

			//左边线拉伸过程中，右、底边线固定，宽度和高度控制
			var width = cutPos.width - e.movementX
			if (width < _disWidth) {	//小于最小展示宽度则不能再缩小
				width = _disWidth
			} else {
				if (cutPos.right - imgPos.left < width) {
					width = cutPos.right - imgPos.left
					_cutter.style.width = width + 'px'
					_cutter.style.height = width / _ratio + 'px'
					return
				}						
			}

			var height = cutPos.height - e.movementX / _ratio
			if (height > _disHeight) {	//小于最小展示高度则不能再缩小
				if (cutPos.bottom - imgPos.top < height) {
					height = cutPos.bottom - imgPos.top
					_cutter.style.width = height * _ratio + 'px'
					_cutter.style.height = height + 'px'
					return
				}						
			}

			_cutter.style.width = width + 'px'
			_cutter.style.height = width / _ratio + 'px'
		}
		//拖拽裁剪区右边线
		if (_target === _cRight) {
			if (cutPos.right > imgPos.right) {
				_cutter.style.left = ''
				_cutter.style.right = 0
				return
			} else if (cutPos.right === imgPos.right && e.movementX > 0) {	//超过右边距且仍向外移动
				return
			} else if (cutPos.bottom > imgPos.bottom) {
				_cutter.style.top = ''
				_cutter.style.bottom = 0
				return
			}	else if (cutPos.bottom === imgPos.bottom && e.movementX > 0)	{
				return
			}

			_cutter.style.left = cutPos.left - imgPos.left + 'px'
			_cutter.style.top = cutPos.top - imgPos.top + 'px'

			//右边线拉伸过程中，顶、左边线固定，宽度和高度控制
			var width = cutPos.width + e.movementX
			if (width < _disWidth) {
				width = _disWidth
			} else {
				if (imgPos.right - cutPos.left < width) {
					width = imgPos.right - cutPos.left
					_cutter.style.width = width + 'px'
					_cutter.style.height = width / _ratio + 'px'
					return
				}						
			}

			var height = cutPos.height + e.movementX / _ratio
			if (height > _disHeight) {
				if (imgPos.bottom - cutPos.top < height) {
					height = imgPos.bottom - cutPos.top
					_cutter.style.width = height * _ratio + 'px'
					_cutter.style.height = height + 'px'
					return
				}						
			}

			_cutter.style.width = width + 'px'
			_cutter.style.height = width / _ratio + 'px'
		}
	}

	/*
	 * 释放鼠标点击事件
	 */
	function mouseup(e) {
		document.removeEventListener('mousemove', mousemove)
		document.removeEventListener('mouseup', mouseup)			
	}
})(window)