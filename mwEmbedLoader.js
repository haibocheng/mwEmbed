// The version of this script
var logIfInIframe = ( typeof preMwEmbedConfig != 'undefined' && preMwEmbedConfig['EmbedPlayer.IsIframeServer'] ) ? ' ( iframe ) ': '';
kWidget.log( 'Kaltura HTML5 Version: ' + KALTURA_LOADER_VERSION  + logIfInIframe );

/**
 * Url flags:
 */
// Note forceMobileHTML5 can be disabled by uiConf 
if( document.URL.indexOf('forceMobileHTML5') !== -1 ){
	mw.setConfig( 'forceMobileHTML5', true );
}

/**
 * A version comparison utility function Handles version of types
 * {Major}.{MinorN}.{Patch}
 * 
 * @param {String}
 *            minVersion Minimum version needed
 * @param {String}
 *            clientVersion Client version to be checked
 * 
 * @return true if the version is at least of minVersion false if the
 *         version is less than minVersion
 */

if( ! mw.versionIsAtLeast ){
	mw.versionIsAtLeast = function( minVersion, clientVersion ) {
		var minVersionParts = minVersion.split('.');
		var clientVersionParts = clientVersion.split('.');
		for( var i =0; i < minVersionParts.length; i++ ) {
			if( parseInt( clientVersionParts[i] ) > parseInt( minVersionParts[i] ) ) {
				return true;
			}
			if( parseInt( clientVersionParts[i] ) < parseInt( minVersionParts[i] ) ) {
				return false;
			}
		}
		// Same version:
		return true;
	};
}
// Wrap mw.ready to preMwEmbedReady values
if( !mw.ready ){
	mw.ready = function( fn ){	
		window.preMwEmbedReady.push( fn );
		kWidget.domReady.ready(function(){
			kAddScript();
		});
	};
}

// Set iframe config if in the client page, will be passed to the iframe along with other config
if( ! mw.getConfig('EmbedPlayer.IsIframeServer') ){
	mw.setConfig('EmbedPlayer.IframeParentUrl', document.URL );
	mw.setConfig('EmbedPlayer.IframeParentTitle', document.title);
	mw.setConfig('EmbedPlayer.IframeParentReferrer', document.referrer);
}

// Check DOM for Kaltura embeds ( fall forward ) 
// && html5 video tag ( for fallback & html5 player interface )
function kCheckAddScript(){
	// Check if we already have got uiConfJs or not
	if( mw.getConfig( 'Kaltura.EnableEmbedUiConfJs' ) && 
		! mw.getConfig( 'Kaltura.UiConfJsLoaded') && ! mw.getConfig('EmbedPlayer.IsIframeServer') ){
		// We have not yet loaded uiConfJS... load it for each ui_conf id
		var playerList = kWidget.getKalturaPlayerList();
		var baseUiConfJsUrl = SCRIPT_LOADER_URL.replace( 'ResourceLoader.php', 'services.php?service=uiconfJs');
		var requestCount = playerList.length -1;
		for( var i=0;i < playerList.length; i++){
			kWidget.appendScript( baseUiConfJsUrl + kWidget.embedSettingsToURL( playerList[i].kEmbedSettings ), function(){
				requestCount--;
				if( requestCount == 0){
					kCheckAddScript();
				}
			});
		}
		mw.setConfig( 'Kaltura.UiConfJsLoaded', true );
		return ;
	}

	// Set url based config ( as long as it not disabled ) 
	if( mw.getConfig( 'disableForceMobileHTML5') ){
		mw.setConfig( 'forceMobileHTML5', false );
	}
	
	// Check if we have player rules and then issue kAddScript call
	if( window.kUserAgentPlayerRules ){
		kAddScript();
		return ;
	}

	/**
	 * If Kaltura.AllowIframeRemoteService is not enabled force in page rewrite:
	 */
	var serviceUrl = mw.getConfig('Kaltura.ServiceUrl');
	if( ! mw.getConfig( 'Kaltura.AllowIframeRemoteService' ) ) {
		if( ! serviceUrl || serviceUrl.indexOf( 'kaltura.com' ) === -1 ){
			// if not hosted on kaltura for now we can't use the iframe to load the player
			mw.setConfig( 'Kaltura.IframeRewrite', false );
			mw.setConfig( 'Kaltura.UseManifestUrls', false);
		}
	}

	// If user javascript is using mw.ready add script
	if( window.preMwEmbedReady.length ) {
		kAddScript();
		return ;
	}
	if( ! mw.getConfig( 'Kaltura.ForceFlashOnDesktop' )
			&&
		( mw.getConfig( 'Kaltura.LoadScriptForVideoTags' ) && kPageHasAudioOrVideoTags()  )
	){
		kAddScript();
		return ;
	}
	// If document includes kaltura embed tags && isMobile safari:
	if ( kWidget.isHTML5FallForward()
			&&
		kWidget.getKalturaPlayerList().length
	) {
		// Check for Kaltura objects in the page
		kAddScript();
		return ;
	}

	// Check if no flash and no html5 and no forceFlash ( direct download link )
	// for debug purpose:
	// kSupportsFlash = function() {return false}; kWidget.supportsHTML5 = function() {return false};
	if( ! kWidget.supportsFlash() && ! kWidget.supportsHTML5() && ! mw.getConfig( 'Kaltura.ForceFlashOnDesktop' ) ){
		kAddScript();
		return ;
	}
	// Restore the jsCallbackReady ( we are not rewriting )
	if( kWidget.getKalturaPlayerList().length ){
		kWidget.restoreKDPCallback();
	}
}

// Add the kaltura html5 mwEmbed script
var kAddedScript = false;
function kAddScript( callback ){
	if( kAddedScript ){
		if( callback )
			callback();
		return ;
	}
	kAddedScript = true;
	
	if( window.jQuery && !mw.versionIsAtLeast( '1.3.2', jQuery.fn.jquery ) ){
		mw.setConfig( 'EmbedPlayer.EnableIframeApi', false );
	}
	
	var jsRequestSet = [];
	if( typeof window.jQuery == 'undefined' ) {
		jsRequestSet.push( 'window.jQuery' );
	}
	// Check if we are using an iframe ( load only the iframe api client ) 
	if( mw.getConfig( 'Kaltura.IframeRewrite' ) && ! kPageHasAudioOrVideoTags() ) {
		if( !window.kUserAgentPlayerRules && mw.getConfig( 'EmbedPlayer.EnableIframeApi') && ( kWidget.supportsFlash() || kWidget.supportsHTML5() ) ){
			jsRequestSet.push( 'mwEmbed', 'mw.style.mwCommon', '$j.cookie', '$j.postMessage', 'mw.EmbedPlayerNative', 'mw.IFramePlayerApiClient', 'mw.KWidgetSupport', 'mw.KDPMapping', 'JSON', 'fullScreenApi' );		
			// Load a minimal set of modules for iframe api
			kLoadJsRequestSet( jsRequestSet, callback );
			return ;
		} else {
			var rewriteObjects = kWidget.getKalturaPlayerList();
			for( var i=0; i < rewriteObjects.length; i++ ){
					kWidget.embed( rewriteObjects[i].id, rewriteObjects[i].kEmbedSettings );
			}		
			// if we don't have a mw.ready function we don't need to load the script library
			if( !window.preMwEmbedReady.length ){
				return ;
			}
		}
	}
	
	// Add all the classes needed for video 
	jsRequestSet.push(
	    'mwEmbed',
	    // mwEmbed utilities: 
		'mw.Uri',
		'fullScreenApi',
		
		// core skin: 
		'mw.style.mwCommon',
		// embed player:
		'mw.EmbedPlayer',
		'mw.processEmbedPlayers',

		'mw.MediaElement',
		'mw.MediaPlayer',
		'mw.MediaPlayers',
		'mw.MediaSource',
		'mw.EmbedTypes',
		
		'mw.style.EmbedPlayer',
		'mw.PlayerControlBuilder',
		// default skin: 
		'mw.PlayerSkinMvpcf',
		'mw.style.PlayerSkinMvpcf',
		// common playback methods:
		'mw.EmbedPlayerNative',
		'mw.EmbedPlayerKplayer',
		'mw.EmbedPlayerJava',
		// jQuery lib
		'$j.ui',  
		'$j.widget',
		'$j.ui.mouse',
		'$j.fn.hoverIntent',
		'$j.cookie',
		'JSON',
		'$j.ui.slider',
		'$j.fn.menu',
		'mw.style.jquerymenu',
		// Timed Text module
		'mw.TimedText',
		'mw.style.TimedText'
	);

	// If an iframe server include iframe server stuff: 
	if( mw.getConfig('EmbedPlayer.IsIframeServer') ){
		jsRequestSet.push(
			'$j.postMessage',
			'mw.IFramePlayerApiServer'
		);
	}
	
	// Add the jquery ui skin: 
	if( ! mw.getConfig('IframeCustomjQueryUISkinCss' ) ){
		if( mw.getConfig( 'jQueryUISkin' ) ){
			jsRequestSet.push( 'mw.style.ui_' + mw.getConfig( 'jQueryUISkin' )  );
		} else {
			jsRequestSet.push( 'mw.style.ui_kdark'  );
		}
	}
	
	var objectPlayerList = kWidget.getKalturaPlayerList();

	// Check if we are doing object rewrite ( add the kaltura library ) 
	if ( kWidget.isHTML5FallForward() || objectPlayerList.length ){
		// Kaltura client libraries:
		jsRequestSet.push(
		  'MD5',
		  'utf8_encode',
		  'base64_encode',
		  //'base64_decode',
		  "mw.KApi",
		  'mw.KWidgetSupport',
		  'mw.KAnalytics',
		  'mw.KDPMapping',
		  'mw.KCuePoints',
		  'mw.KTimedText',
		  'mw.KLayout',
		  'mw.style.klayout',
		  'titleLayout',
		  'volumeBarLayout',
		  'playlistPlugin',
		  'controlbarLayout',
		  'faderPlugin',
		  'watermarkPlugin',
		  'adPlugin',
		  'captionPlugin',
		  'bumperPlugin',
		  'myLogo'
		);
		// Kaltura playlist support ( so small relative to client libraries that we always include it )	
		jsRequestSet.push(
		   'mw.Playlist',
		   'mw.style.playlist',
		   'mw.PlaylistHandlerMediaRss',
		   'mw.PlaylistHandlerKaltura', 
		   'mw.PlaylistHandlerKalturaRss'
		);
		// Include iScroll
		jsRequestSet.push(
			'iScroll'
		);
		
	}
	kLoadJsRequestSet( jsRequestSet, callback );
}

function kLoadJsRequestSet( jsRequestSet, callback ){
	if( typeof SCRIPT_LOADER_URL == 'undefined' ){
		alert( 'Error invalid entry point');
	}
	var url = SCRIPT_LOADER_URL + '?class=';
	// Add all the requested classes
	url+= jsRequestSet.join(',') + ',';
	url+= '&urid=' + KALTURA_LOADER_VERSION;
	url+= '&uselang=en';
	if ( mw.getConfig('debug') ){
		url+= '&debug=true';
	}
	// Check for $ library
	if( typeof $ != 'undefined' && ! $.jquery ){
		window['pre$Lib'] = $;
	}
	
	// Check for special global callback for script load
	kWidget.appendScript(url, function(){
		if( window['pre$Lib'] ){
			jQuery.noConflict();
			window['$'] = window['pre$Lib'];
		}
		if( callback ){
			callback();
		}
	});
}
function kPageHasAudioOrVideoTags(){
	// if selector is set to false or is empty return false
	if( mw.getConfig( 'EmbedPlayer.RewriteSelector' ) === false || 
		mw.getConfig( 'EmbedPlayer.RewriteSelector' ) == '' ){
		return false;
	}
	// If document includes audio or video tags
	if( document.getElementsByTagName('video').length != 0
		|| document.getElementsByTagName('audio').length != 0 ) {
		return true;
	}
	return false;
}

/**
 * Get Kaltura thumb url from entry object
 */
mw.getKalturaThumbUrl = function ( entry ){
	if( entry.width == '100%')
		entry.width = 400;
	if( entry.height == '100%')
		entry.height = 300;

	var ks = ( entry.ks ) ? '?ks=' + entry.ks : '';

	// Support widget_id based thumbs: 
	if( entry.widget_id && ! entry.partner_id ){
		entry.partner_id = entry.widget_id.substr(1);
	}
	
	return mw.getConfig('Kaltura.CdnUrl') + '/p/' + entry.partner_id + '/sp/' +
		entry.partner_id + '00/thumbnail/entry_id/' + entry.entry_id + '/width/' +
		parseInt(entry.width) + '/height/' + parseInt(entry.height) + ks;
};

/*
 * When using Frameset that have iframe with video tag inside, the iframe is not positioned correctly. and you can't click on the controls.
 * If order to fix that, we allow to hosting page to pass the following configuration:
 * mw.setConfig('FramesetSupport.Enabled', true); - Disable HTML controls on iPad
 * mw.setConfig('FramesetSupport.PlayerCssProperties', {}); - CSS properties object to apply to the player
 * We will use 'PlayerCssProperties' only for iOS devices running version 3-4 ( the position issue was fixed in iOS5)
 */
kWidget.getAdditionalTargetCss = function() {
	var ua = navigator.userAgent;
	if( mw.getConfig('FramesetSupport.Enabled') && kWidget.isIOS() && (ua.indexOf('OS 3') > 0 || ua.indexOf('OS 4') > 0) ) {
		return mw.getConfig('FramesetSupport.PlayerCssProperties') || {};
	}
	return {};
};
kWidget.domReady.ready(function() {
	if( mw.getConfig('FramesetSupport.Enabled') && kWidget.isIOS() ) {
		mw.setConfig('EmbedPlayer.EnableIpadHTMLControls', false );
	}
});

// Include legacy support for supports html5
function kIsIOS(){
	kWidget.log('kIsIOS is deprecated. Please use kWidget.isIOS');
	return kWidget.isIOS();
}
function kSupportsHTML5(){
	kWidget.log('kSupportsHTML5 is deprecated. Please use kWidget.supportsHTML5');
	return kWidget.supportsHTML5();
}
function kGetFlashVersion(){
	kWidget.log('kGetFlashVersion is deprecated. Please use kWidget.getFlashVersion');
	return kWidget.getFlashVersion();
}
function kSupportsFlash(){
	kWidget.log('kSupportsFlash is deprecated. Please use kWidget.supportsFlash');
	return kWidget.supportsFlash();
}
function kGetKalturaEmbedSettings( swfUrl, flashvars ){
	kWidget.log('kGetKalturaEmbedSettings is deprecated. Please use kWidget.getEmbedSettings');
	return kWidget.getEmbedSettings( swfUrl, flashvars );	
}
function kalturaIframeEmbed( targetId, settings ){
	kWidget.log('kalturaIframeEmbed is deprecated. Please use kWidget.embed');
	kWidget.embed( targetId, settings );
}
function kOutputFlashObject( targetId, settings ) {
	kWidget.log('kOutputFlashObject is deprecated. Please use kWidget.outputFlashObject');
	kWidget.outputFlashObject( targetId, settings );
}
function kIsHTML5FallForward( ){
	kWidget.log('kIsHTML5FallForward is deprecated. Please use kWidget.isHTML5FallForward');
	return kWidget.isHTML5FallForward();
}
function kIframeWithoutApi( replaceTargetId, kEmbedSettings ){
	kWidget.log('kIframeWithoutApi is deprecated. Please use kWidget.outputIframeWithoutApi');
	return kWidget.outputIframeWithoutApi( replaceTargetId, kEmbedSettings );
}
function kDirectDownloadFallback( replaceTargetId, kEmbedSettings , options ) {
	kWidget.log('kDirectDownloadFallback is deprecated. Please use kWidget.outputDirectDownload');
	return kWidget.outputDirectDownload( replaceTargetId, kEmbedSettings , options );
}
function kOverideJsFlashEmbed() {
	kWidget.log('kOverideJsFlashEmbed is deprecated. Please use kWidget.overrideJsFlashEmbed');
	kWidget.overideJsFlashEmbed();
}
function kIsIE(){
	return /msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent);
}

// Try and override the swfObject at runtime
// In case it was included before mwEmbedLoader and the embedSWF call is inline ( so we can't wait for dom ready )
kWidget.overideJsFlashEmbed();
kWidget.domReady.ready( kWidget.overideJsFlashEmbed );

// Check inline and when the DOM is ready:
kWidget.checkForKDPCallback();
kWidget.domReady.ready( kWidget.checkForKDPCallback );
