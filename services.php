<?php 
/**
 * Provides and entry point for javascript services .
 * 
 * Will eventually replace all the entry points
 * 
 * TODO make this into a real api entry point. 
 * 
 * TODO adopt an api framework ( maybe mediaWiki? ) not sure. 
 * 			other good options probably exist. 
 */
// Include configuration: ( will include LocalSettings.php, and all the extension hooks ) 
require(  dirname( __FILE__ ) . '/includes/DefaultSettings.php' );

$mwEmbedApi = new mwEmbedApi();
$mwEmbedApi->handleRequest();

// Dispach on extension entry points 
class mwEmbedApi{
	function handleRequest(){
		global $wgMwEmbedApiServices;
		$serviceName = $this->getUrlParam('service');
		if( isset( $wgMwEmbedApiServices[$serviceName] ) ){
			$service = new $wgMwEmbedApiServices[$serviceName ];
			$service->run();
		}
	}
	/**
	 * Parse the url request  
	 * TODO actual url request handling
	 */
	function getUrlParam( $param ){
		if( isset( $_REQUEST[ $param ] ) ){
			return $_REQUEST[ $param ];
		}
	}
}