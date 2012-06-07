( function( mw, $, playerData ) { "use strict";

	// Parse any configuration options passed in via hash url more reliable than window['parent']
	try {
		if( window['parent'] && window['parent']['preMwEmbedConfig'] ){
			// Grab config from parent frame:
			mw.config.set( window['parent']['preMwEmbedConfig'] );
			// Set the "iframeServer" to the current domain ( do not include hash tag )
			mw.config.set( 'EmbedPlayer.IframeParentUrl', document.URL.replace(/#.*/, '' ) ); 
		}
	} catch( e ) {
		kWidget.log( "Error in getting configuration from parent iframe" );
	}
	
	mw.config.set( 'KalturaSupport.PlayerConfig', playerData['playerConfig'] );
	
	// We should first read the config for the hashObj and after that overwrite with our own settings
	// The entire block below must be after mw.config.set( hashObj.mwConfig );
	
	// Don't do an iframe rewrite inside an iframe
	mw.config.set( 'Kaltura.IframeRewrite', false );
	
	// Set a prepend flag so its easy to see whats happening on client vs server side of the iframe:
	mw.config.set( 'Mw.LogPrepend', 'iframe:');
	
	// Don't rewrite the video tag from the loader ( if html5 is supported it will be
	// invoked below and respect the persistant video tag option for iPad overlays )
	mw.config.set( 'Kaltura.LoadScriptForVideoTags', false );
	
	// Don't wait for player metada for size layout and duration Won't be needed since
	// we add durationHint and size attributes to the video tag
	mw.config.set( 'EmbedPlayer.WaitForMeta', false );
	
	// Add Packaging Kaltura Player Data ( JSON Encoded )
	mw.config.set( 'KalturaSupport.IFramePresetPlayerData', playerData['resultObject'] );
	
	mw.config.set( 'EmbedPlayer.IframeParentPlayerId', playerData['playerId'] );			
	
	// Set uiConf global vars for this player ( overides on-page config )
	mw.config.set( playerData['enviornmentConfig'] );
	
	// Remove the fullscreen option if we are in an iframe: 
	if( mw.config.get('EmbedPlayer.IsFullscreenIframe') ){
		mw.config.set('EmbedPlayer.EnableFullscreen', false );
	} else {
		// If we don't get a 'EmbedPlayer.IframeParentUrl' update fullscreen to pop-up new 
		// window. ( we won't have the iframe api to resize the iframe ) 
		if( mw.config.get('EmbedPlayer.IframeParentUrl') === null ){
			mw.config.set( "EmbedPlayer.NewWindowFullscreen", true ); 
		}
	}
	// For testing limited capacity browsers
	// kWidget.supportsHTML5 = function(){ return false };
	// kWidget.supportsFlash= function(){ return false; };
	
	if( playerData['isObjecRewrite'] ) {
		mw.log('Error: rewrite object is not supported');
		return ;
	}
	// Setup player
	var playerConfig = mw.config.get( 'KalturaSupport.PlayerConfig' );
	var playerId = mw.config.get( 'EmbedPlayer.IframeParentPlayerId');
	
	var removeElement = function( elemId ) {
		if( document.getElementById( elemId ) ){
			try {
				var el = document.getElementById( elemId );
				el.parentNode.removeChild(el);
			} catch ( e ){
				// Failed to remove element
			}
		}
	};
	
	// Include custom resources:
	mw.config.set( 'Mw.CustomResourceIncludes', playerData['customPlayerIncludes'] );
	
	if( kWidget.isUiConfIdHTML5( playerConfig.uiConfId ) 
			|| 
		!( kWidget.supportsFlash() || mw.config.get( 'Kaltura.ForceFlashOnDesktop' ) ) 
	){
		// remove the no_rewrite flash object ( never used in rewrite )
		removeElement('kaltura_player_iframe_no_rewrite');

		// Once the mwEmbed is ready add document resize binding
		mw.ready(function(){
			// Try again to remove the flash player if not already removed: 
			$('#kaltura_player_iframe_no_rewrite').remove();
		
			var embedPlayer = $( '#' + playerId )[0];
			// Try to seek to the IframeSeekOffset time:
			if( mw.config.get( 'EmbedPlayer.IframeCurrentTime' ) ){
				embedPlayer.currentTime = mw.config.get( 'EmbedPlayer.IframeCurrentTime' );					
			}
			// Maintain play state for html5 browsers
			if( mw.config.get('EmbedPlayer.IframeIsPlaying') ){
				embedPlayer.play();
			}
		
			function getWindowSize(){
				return {
					'width' : $( window ).width(),
					'height' : $( window ).height()
				};
			};
			function doResizePlayer(){
				var embedPlayer = $( '#' + playerId )[0];						
				embedPlayer.resizePlayer( getWindowSize() );
			};
		
			// Bind window resize to reize the player:
			$( window ).resize( doResizePlayer );
		
			// Resize the player per player on ready
			if( mw.config.get('EmbedPlayer.IsFullscreenIframe') ){
					doResizePlayer();
			}
		});
	} else {
		// Remove the video tag and output a clean "object" or file link
		// ( if javascript is off the child of the video tag so would be played,
		//  but rewriting gives us flexiblity in in selection criteria as
		// part of the javascript check kIsHTML5FallForward )
		removeElement( 'videoContainer' );
		// Write out the embed object
		document.write( playerData['flashHTML'] );
	}


})( window.mw, jQuery, kalturaIframePackageData );