/**
 * Copyright @ 2017 Esri.
 * All rights reserved under the copyright laws of the United States and applicable international laws, treaties, and conventions.
 */
define(["dojo/_base/lang","dojo/_base/array","esri/core/declare","esri/core/lang","esri/views/3d/webgl-engine/lib/Util","../../webgl-engine-extensions/VertexBufferLayout","../../webgl-engine-extensions/GLVertexArrayObject","../../webgl-engine-extensions/GLXBO","../../support/fx3dUtils","../../support/fx3dUnits","../Effect","./PulseMaterial"],function(e,i,t,r,s,n,a,h,o,d,_,l){var g=s.assert,u=s.VertexAttrConstants,f=40.11,m={Circle:"circle",Square:"square",Triangle:"triangle",Hexagon:"hexagon",Wave:"wave"},c={circle:48,square:4,triangle:3,hexagon:6},y=t([_],{declaredClass:"esri.views.3d.effects.Pulse.PulseEffect",effectName:"Pulse",constructor:function(i){e.hitch(this,i),this.orderId=2,this._sizeInMeters=[]},_initRenderingInfo:function(){this.renderingInfo.radius=1e4,this.renderingInfo.solidColor=[255,255,20],this.renderingInfo.haloColors=[o.rgbNames.cadetblue,o.rgbNames.yellowgreen,o.rgbNames.lightpink,o.rgbNames.orangered,o.rgbNames.green,o.rgbNames.indianred],this._colorBarDirty=!0,this.renderingInfo.shapeType=m.Circle,this._drawRing=!0,this._renderingInfoDirty=!0,this._vacDirty=!0,this._shapeDirty=!0,this.inherited(arguments)},_doRenderingInfoChange:function(e){this.inherited(arguments);for(var i in e)e.hasOwnProperty(i)&&this.renderingInfo.hasOwnProperty(i)&&(r.endsWith(i.toLowerCase(),"info")?o.isInforAttrChanged(this.renderingInfo[i],e[i])&&(this._renderingInfoDirty=!0):r.endsWith(i.toLowerCase(),"color")?e[i]instanceof Array&&3==e[i].length&&(this.renderingInfo[i]=[e[i][0]/255,e[i][1]/255,e[i][2]/255]):r.endsWith(i.toLowerCase(),"colors")?e[i]instanceof Array&&(this.renderingInfo[i]=e[i],this._colorBarDirty=!0,this._renderingInfoDirty=!0):"shapetype"===i.toLowerCase()?this.renderingInfo[i]!=e[i].toLowerCase()&&(this._vacDirty=!0,this._shapeDirty=!0,this._isAddingGeometry=!1,this._renderingInfoDirty=!0,this.renderingInfo[i]=e[i].toLowerCase(),this._colourMapDirty=!0):"radius"===i.toLowerCase()||"transparency"===i.toLowerCase()?(this._clampScope(e,i),"radius"==i&&this._radiusUnit?this.renderingInfo[i]=d.toMeters(this._radiusUnit,e[i],this._view.viewingMode):this.renderingInfo[i]=e[i]):typeof e[i]==typeof this.renderingInfo[i]&&(this.renderingInfo[i]=e[i]))},_updateDefaultLabelHeight:function(){this._layer._labelDefaultHeight=null},setContext:function(t){this.inherited(arguments),this._effectConfig&&e.isArray(this._effectConfig.renderingInfo)&&(this._radiusUnit=null,i.forEach(this._effectConfig.renderingInfo,function(e){"radius"===e.name.toLowerCase()&&(this._radiusUnit=e.unit,this.renderingInfo.radius=d.toMeters(this._radiusUnit,this.renderingInfo.radius,this._view.viewingMode))}.bind(this)))},destroy:function(){this._resetXBOs(),this._dispose("_vao")},_resetXBOs:function(){this._dispose("_vbo"),this._dispose("_ibo")},_initVertexLayout:function(){this._vertexAttrConstants=[u.POSITION,u.AUXPOS1],this._vertexBufferLayout=new n(this._vertexAttrConstants,[3,3],[5126,5126])},_initRenderContext:function(){this.inherited(arguments),this._vacDirty&&(this._initVertexLayout(),this._resetXBOs(),this._vacDirty=!1,this._vao&&(this._vao.unbind(),this._vao._initialized=!1)),this._vbo||(this._vbo=new h(this._gl,!0,this._vertexBufferLayout)),this._ibo||(this._ibo=new h(this._gl,!1)),this._vaoExt&&(this._vao=new a(this._gl,this._vaoExt));var e=!1;switch(this.renderingInfo.shapeType){case m.Circle:case m.Triangle:case m.Square:case m.Hexagon:this._geometryVertexNum=4,this._geometryIndexNum=6,this._drawRing=!0,e=this._buildRingGeometries();break;case m.Wave:this._geometryVertexNum=3,this._geometryIndexNum=6,this._drawRing=!1,e=this._buildWaveGeometries();break;default:this._drawRing=!1}return e},_getAltitude:function(e){return"number"==typeof e?f>e&&(e=f):e=f,e},_buildRingGeometries:function(){var e=this._isAddingGeometry?this._addedGraphics:this._allGraphics(),i=this._isAddingGeometry?this._toAddGraphicsIndex:0;if(e.length>0){var t,r,s,n,a=c[this.renderingInfo.shapeType],h=Math.max(3,a),o=0,d=0,_=h*this._geometryVertexNum,l=this._vertexBufferLayout.getStride(),g=new Float32Array(e.length*l*_),u=new Uint32Array(e.length*h*this._geometryIndexNum),f=0,m=0;for(r=0;r<e.length;r++)if(t=e[r],null!=t.geometry){for(s=0;_>s;s++)o=(r*_+s)*l,f=s%this._geometryVertexNum,g[0+o]=t.geometry.longitude,g[1+o]=t.geometry.latitude,g[2+o]=this._getAltitude(t.geometry.altitude),g[3+o]=r+i,g[4+o]=f,m=Math.floor(s/4),(2===f||3===f)&&(m+=1),g[5+o]=m/h;for(n=(r+i)*_,s=0;h>s;s++)d=(r*h+s)*this._geometryIndexNum,u[0+d]=0+n+s*this._geometryVertexNum,u[1+d]=2+n+s*this._geometryVertexNum,u[2+d]=1+n+s*this._geometryVertexNum,u[3+d]=0+n+s*this._geometryVertexNum,u[4+d]=3+n+s*this._geometryVertexNum,u[5+d]=2+n+s*this._geometryVertexNum}return this._vbo.addData(this._isAddingGeometry,g),this._ibo.addData(this._isAddingGeometry,u),this._vao&&(this._vao._initialized=!1),this._resetAddGeometries(),!0}return!1},_buildWaveGeometries:function(){var e=this._isAddingGeometry?this._addedGraphics:this._allGraphics(),i=this._isAddingGeometry?this._toAddGraphicsIndex:0;if(e.length>0){this._waveSegments=32;var t,r,s,n,a,h,o,d=this._waveSegments,_=d-1,l=[],u=[];for(a=0;d>a;a++)for(n=0;d>n;n++)l.push([n,a]),d-1>a&&d-1>n&&(h=a*d+n,o=(a+1)*d+n,u.push([h,o,h+1,h+1,o,o+1]));var f=l.length,m=this._vertexBufferLayout.getStride(),c=new Float32Array(e.length*m*f),y=_*_*this._geometryIndexNum;g(u.length*u[0].length===y);var v,x=new Uint32Array(e.length*y),b=0,p=0;for(t=0;t<e.length;t++){for(v=e[t],r=0;f>r;r++)b=(t*f+r)*m,c[0+b]=v.geometry.longitude,c[1+b]=v.geometry.latitude,c[2+b]=this._getAltitude(v.geometry.altitude),c[3+b]=t+i,c[4+b]=l[r][0],c[5+b]=l[r][1];for(s=t*f+i,r=0;r<u.length;r++)p=(t*u.length+r)*this._geometryIndexNum,x[0+p]=u[r][0]+s,x[1+p]=u[r][1]+s,x[2+p]=u[r][2]+s,x[3+p]=u[r][3]+s,x[4+p]=u[r][4]+s,x[5+p]=u[r][5]+s}return this._vbo.addData(this._isAddingGeometry,c),this._ibo.addData(this._isAddingGeometry,x),this._resetAddGeometries(),!0}return!1},_initColorBar:function(){if(!this._colorBarDirty)return!0;this._colorBarTexture||(this._colorBarTexture=this._gl.createTexture());var e=this._gl.getParameter(32873);this._gl.bindTexture(3553,this._colorBarTexture),this._gl.pixelStorei(37440,!0),this._gl.texParameteri(3553,10240,9728),this._gl.texParameteri(3553,10241,9728),this._gl.texParameteri(3553,10242,33071),this._gl.texParameteri(3553,10243,33071);var i=o.createColorBarTexture(32,1,this.renderingInfo.haloColors);return this._gl.texImage2D(3553,0,6408,6408,5121,i),this._gl.generateMipmap(3553),this._gl.bindTexture(3553,e),0===this._gl.getError()?!0:!1},_loadShaders:function(){return this.inherited(arguments),this._material||(this._material=new l({pushState:this._pushState.bind(this),restoreState:this._restoreState.bind(this),gl:this._gl,viewingMode:this._view.viewingMode,shaderSnippets:this._shaderSnippets})),this._material.loadShaders()},_localBinds:function(){this._vbo.bind(this._material._program),this._vertexBufferLayout.enableVertexAttribArrays(this._gl,this._material._program),this._ibo.bind()},_bindBuffer:function(){this._vao?(this._vao._initialized||this._vao.initialize(this._localBinds.bind(this)),this._vao.bind()):this._localBinds()},_unBindBuffer:function(){this._vao?this._vao.unbind():(this._vbo.unbind(),this._vertexBufferLayout.disableVertexAttribArrays(this._gl,this._material._program),this._ibo.unbind())},render:function(i,t){this.inherited(arguments),this._layer.visible&&this.ready&&this._bindPramsReady()&&(this._hasSentReady||(this._layer.emit("fx3d-ready"),this._hasSentReady=!0),this._material.bind(e.mixin({},{sp:this._drawRing,el:this._waveSegments,ip:this._vizFieldVerTextures[this._vizFieldDefault],ss:this._vizFieldVerTextures[this._vizFields[this._currentVizPage]],mm:this._vizFieldVerTextureSize,em:this.renderingInfo.animationInterval,ls:[this._scopes.radius[0],this.renderingInfo.radius],es:this.renderingInfo.transparency,ie:this._colorBarTexture,lm:this._vizFieldMinMaxs[this._vizFieldDefault].min>this._vizFieldMinMaxs[this._vizFields[this._currentVizPage]].min?this._vizFieldMinMaxs[this._vizFields[this._currentVizPage]].min:this._vizFieldMinMaxs[this._vizFieldDefault].min,ll:this._vizFieldMinMaxs[this._vizFieldDefault].max>this._vizFieldMinMaxs[this._vizFields[this._currentVizPage]].max?this._vizFieldMinMaxs[this._vizFieldDefault].max:this._vizFieldMinMaxs[this._vizFields[this._currentVizPage]].max,le:this.renderingInfo.solidColor},i),t),this._bindBuffer(),this._gl.drawElements(4,this._ibo.getNum(),5125,0),this._material.release(t),this._unBindBuffer())}});return y});