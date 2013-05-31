/*
* Copyright 2013, Nexedi SA
* Released under the LGPL license.
* http://www.gnu.org/licenses/lgpl.html
*/

(function (scope) {
  "use strict";
  Object.defineProperty(scope, "ComplexQueries", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: {}
  });
Object.defineProperty(scope.ComplexQueries, "parse", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (string) {

/*
	Default template driver for JS/CC generated parsers running as
	browser-based JavaScript/ECMAScript applications.
	
	WARNING: 	This parser template will not run as console and has lesser
				features for debugging than the console derivates for the
				various JavaScript platforms.
	
	Features:
	- Parser trace messages
	- Integrated panic-mode error recovery
	
	Written 2007, 2008 by Jan Max Meyer, J.M.K S.F. Software Technologies
	
	This is in the public domain.
*/

var NODEJS__dbg_withtrace		= false;
var NODEJS__dbg_string			= new String();

function __NODEJS_dbg_print( text )
{
	NODEJS__dbg_string += text + "\n";
}

function __NODEJS_lex( info )
{
	var state		= 0;
	var match		= -1;
	var match_pos	= 0;
	var start		= 0;
	var pos			= info.offset + 1;

	do
	{
		pos--;
		state = 0;
		match = -2;
		start = pos;

		if( info.src.length <= start )
			return 19;

		do
		{

switch( state )
{
	case 0:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 8 ) || ( info.src.charCodeAt( pos ) >= 10 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || info.src.charCodeAt( pos ) == 59 || ( info.src.charCodeAt( pos ) >= 63 && info.src.charCodeAt( pos ) <= 64 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 9 ) state = 2;
		else if( info.src.charCodeAt( pos ) == 40 ) state = 3;
		else if( info.src.charCodeAt( pos ) == 41 ) state = 4;
		else if( info.src.charCodeAt( pos ) == 60 || info.src.charCodeAt( pos ) == 62 ) state = 5;
		else if( info.src.charCodeAt( pos ) == 34 ) state = 11;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 12;
		else if( info.src.charCodeAt( pos ) == 32 ) state = 13;
		else if( info.src.charCodeAt( pos ) == 61 ) state = 14;
		else if( info.src.charCodeAt( pos ) == 65 ) state = 18;
		else if( info.src.charCodeAt( pos ) == 78 ) state = 19;
		else state = -1;
		break;

	case 1:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 2:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else state = -1;
		match = 1;
		match_pos = pos;
		break;

	case 3:
		state = -1;
		match = 3;
		match_pos = pos;
		break;

	case 4:
		state = -1;
		match = 4;
		match_pos = pos;
		break;

	case 5:
		if( info.src.charCodeAt( pos ) == 61 ) state = 14;
		else state = -1;
		match = 11;
		match_pos = pos;
		break;

	case 6:
		state = -1;
		match = 8;
		match_pos = pos;
		break;

	case 7:
		state = -1;
		match = 9;
		match_pos = pos;
		break;

	case 8:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else state = -1;
		match = 6;
		match_pos = pos;
		break;

	case 9:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else state = -1;
		match = 5;
		match_pos = pos;
		break;

	case 10:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else state = -1;
		match = 7;
		match_pos = pos;
		break;

	case 11:
		if( info.src.charCodeAt( pos ) == 34 ) state = 7;
		else if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 91 ) || ( info.src.charCodeAt( pos ) >= 93 && info.src.charCodeAt( pos ) <= 254 ) ) state = 11;
		else if( info.src.charCodeAt( pos ) == 92 ) state = 15;
		else state = -1;
		break;

	case 12:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 82 ) state = 8;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 13:
		state = -1;
		match = 1;
		match_pos = pos;
		break;

	case 14:
		state = -1;
		match = 11;
		match_pos = pos;
		break;

	case 15:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 254 ) ) state = 11;
		else state = -1;
		break;

	case 16:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 67 ) || ( info.src.charCodeAt( pos ) >= 69 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 68 ) state = 9;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 17:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 84 ) state = 10;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 18:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 78 ) state = 16;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 19:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 17;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

}


			pos++;

		}
		while( state > -1 );

	}
	while( 1 > -1 && match == 1 );

	if( match > -1 )
	{
		info.att = info.src.substr( start, match_pos - start );
		info.offset = match_pos;
		

	}
	else
	{
		info.att = new String();
		match = -1;
	}

	return match;
}


function __NODEJS_parse( src, err_off, err_la )
{
	var		sstack			= new Array();
	var		vstack			= new Array();
	var 	err_cnt			= 0;
	var		act;
	var		go;
	var		la;
	var		rval;
	var 	parseinfo		= new Function( "", "var offset; var src; var att;" );
	var		info			= new parseinfo();
	
/* Pop-Table */
var pop_tab = new Array(
	new Array( 0/* begin' */, 1 ),
	new Array( 13/* begin */, 1 ),
	new Array( 12/* search_text */, 1 ),
	new Array( 12/* search_text */, 2 ),
	new Array( 12/* search_text */, 3 ),
	new Array( 14/* and_expression */, 1 ),
	new Array( 14/* and_expression */, 3 ),
	new Array( 15/* boolean_expression */, 2 ),
	new Array( 15/* boolean_expression */, 1 ),
	new Array( 16/* expression */, 3 ),
	new Array( 16/* expression */, 2 ),
	new Array( 16/* expression */, 1 ),
	new Array( 17/* value */, 2 ),
	new Array( 17/* value */, 1 ),
	new Array( 18/* string */, 1 ),
	new Array( 18/* string */, 1 )
);

/* Action-Table */
var act_tab = new Array(
	/* State 0 */ new Array( 7/* "NOT" */,5 , 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 1 */ new Array( 19/* "$" */,0 ),
	/* State 2 */ new Array( 19/* "$" */,-1 ),
	/* State 3 */ new Array( 6/* "OR" */,14 , 7/* "NOT" */,5 , 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 , 19/* "$" */,-2 , 4/* "RIGHT_PARENTHESE" */,-2 ),
	/* State 4 */ new Array( 5/* "AND" */,16 , 19/* "$" */,-5 , 7/* "NOT" */,-5 , 3/* "LEFT_PARENTHESE" */,-5 , 8/* "COLUMN" */,-5 , 11/* "OPERATOR" */,-5 , 10/* "WORD" */,-5 , 9/* "STRING" */,-5 , 6/* "OR" */,-5 , 4/* "RIGHT_PARENTHESE" */,-5 ),
	/* State 5 */ new Array( 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 6 */ new Array( 19/* "$" */,-8 , 7/* "NOT" */,-8 , 3/* "LEFT_PARENTHESE" */,-8 , 8/* "COLUMN" */,-8 , 11/* "OPERATOR" */,-8 , 10/* "WORD" */,-8 , 9/* "STRING" */,-8 , 6/* "OR" */,-8 , 5/* "AND" */,-8 , 4/* "RIGHT_PARENTHESE" */,-8 ),
	/* State 7 */ new Array( 7/* "NOT" */,5 , 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 8 */ new Array( 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 9 */ new Array( 19/* "$" */,-11 , 7/* "NOT" */,-11 , 3/* "LEFT_PARENTHESE" */,-11 , 8/* "COLUMN" */,-11 , 11/* "OPERATOR" */,-11 , 10/* "WORD" */,-11 , 9/* "STRING" */,-11 , 6/* "OR" */,-11 , 5/* "AND" */,-11 , 4/* "RIGHT_PARENTHESE" */,-11 ),
	/* State 10 */ new Array( 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 11 */ new Array( 19/* "$" */,-13 , 7/* "NOT" */,-13 , 3/* "LEFT_PARENTHESE" */,-13 , 8/* "COLUMN" */,-13 , 11/* "OPERATOR" */,-13 , 10/* "WORD" */,-13 , 9/* "STRING" */,-13 , 6/* "OR" */,-13 , 5/* "AND" */,-13 , 4/* "RIGHT_PARENTHESE" */,-13 ),
	/* State 12 */ new Array( 19/* "$" */,-14 , 7/* "NOT" */,-14 , 3/* "LEFT_PARENTHESE" */,-14 , 8/* "COLUMN" */,-14 , 11/* "OPERATOR" */,-14 , 10/* "WORD" */,-14 , 9/* "STRING" */,-14 , 6/* "OR" */,-14 , 5/* "AND" */,-14 , 4/* "RIGHT_PARENTHESE" */,-14 ),
	/* State 13 */ new Array( 19/* "$" */,-15 , 7/* "NOT" */,-15 , 3/* "LEFT_PARENTHESE" */,-15 , 8/* "COLUMN" */,-15 , 11/* "OPERATOR" */,-15 , 10/* "WORD" */,-15 , 9/* "STRING" */,-15 , 6/* "OR" */,-15 , 5/* "AND" */,-15 , 4/* "RIGHT_PARENTHESE" */,-15 ),
	/* State 14 */ new Array( 7/* "NOT" */,5 , 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 15 */ new Array( 19/* "$" */,-3 , 4/* "RIGHT_PARENTHESE" */,-3 ),
	/* State 16 */ new Array( 7/* "NOT" */,5 , 3/* "LEFT_PARENTHESE" */,7 , 8/* "COLUMN" */,8 , 11/* "OPERATOR" */,10 , 10/* "WORD" */,12 , 9/* "STRING" */,13 ),
	/* State 17 */ new Array( 19/* "$" */,-7 , 7/* "NOT" */,-7 , 3/* "LEFT_PARENTHESE" */,-7 , 8/* "COLUMN" */,-7 , 11/* "OPERATOR" */,-7 , 10/* "WORD" */,-7 , 9/* "STRING" */,-7 , 6/* "OR" */,-7 , 5/* "AND" */,-7 , 4/* "RIGHT_PARENTHESE" */,-7 ),
	/* State 18 */ new Array( 4/* "RIGHT_PARENTHESE" */,23 ),
	/* State 19 */ new Array( 19/* "$" */,-10 , 7/* "NOT" */,-10 , 3/* "LEFT_PARENTHESE" */,-10 , 8/* "COLUMN" */,-10 , 11/* "OPERATOR" */,-10 , 10/* "WORD" */,-10 , 9/* "STRING" */,-10 , 6/* "OR" */,-10 , 5/* "AND" */,-10 , 4/* "RIGHT_PARENTHESE" */,-10 ),
	/* State 20 */ new Array( 19/* "$" */,-12 , 7/* "NOT" */,-12 , 3/* "LEFT_PARENTHESE" */,-12 , 8/* "COLUMN" */,-12 , 11/* "OPERATOR" */,-12 , 10/* "WORD" */,-12 , 9/* "STRING" */,-12 , 6/* "OR" */,-12 , 5/* "AND" */,-12 , 4/* "RIGHT_PARENTHESE" */,-12 ),
	/* State 21 */ new Array( 19/* "$" */,-4 , 4/* "RIGHT_PARENTHESE" */,-4 ),
	/* State 22 */ new Array( 19/* "$" */,-6 , 7/* "NOT" */,-6 , 3/* "LEFT_PARENTHESE" */,-6 , 8/* "COLUMN" */,-6 , 11/* "OPERATOR" */,-6 , 10/* "WORD" */,-6 , 9/* "STRING" */,-6 , 6/* "OR" */,-6 , 4/* "RIGHT_PARENTHESE" */,-6 ),
	/* State 23 */ new Array( 19/* "$" */,-9 , 7/* "NOT" */,-9 , 3/* "LEFT_PARENTHESE" */,-9 , 8/* "COLUMN" */,-9 , 11/* "OPERATOR" */,-9 , 10/* "WORD" */,-9 , 9/* "STRING" */,-9 , 6/* "OR" */,-9 , 5/* "AND" */,-9 , 4/* "RIGHT_PARENTHESE" */,-9 )
);

/* Goto-Table */
var goto_tab = new Array(
	/* State 0 */ new Array( 13/* begin */,1 , 12/* search_text */,2 , 14/* and_expression */,3 , 15/* boolean_expression */,4 , 16/* expression */,6 , 17/* value */,9 , 18/* string */,11 ),
	/* State 1 */ new Array(  ),
	/* State 2 */ new Array(  ),
	/* State 3 */ new Array( 12/* search_text */,15 , 14/* and_expression */,3 , 15/* boolean_expression */,4 , 16/* expression */,6 , 17/* value */,9 , 18/* string */,11 ),
	/* State 4 */ new Array(  ),
	/* State 5 */ new Array( 16/* expression */,17 , 17/* value */,9 , 18/* string */,11 ),
	/* State 6 */ new Array(  ),
	/* State 7 */ new Array( 12/* search_text */,18 , 14/* and_expression */,3 , 15/* boolean_expression */,4 , 16/* expression */,6 , 17/* value */,9 , 18/* string */,11 ),
	/* State 8 */ new Array( 16/* expression */,19 , 17/* value */,9 , 18/* string */,11 ),
	/* State 9 */ new Array(  ),
	/* State 10 */ new Array( 18/* string */,20 ),
	/* State 11 */ new Array(  ),
	/* State 12 */ new Array(  ),
	/* State 13 */ new Array(  ),
	/* State 14 */ new Array( 12/* search_text */,21 , 14/* and_expression */,3 , 15/* boolean_expression */,4 , 16/* expression */,6 , 17/* value */,9 , 18/* string */,11 ),
	/* State 15 */ new Array(  ),
	/* State 16 */ new Array( 14/* and_expression */,22 , 15/* boolean_expression */,4 , 16/* expression */,6 , 17/* value */,9 , 18/* string */,11 ),
	/* State 17 */ new Array(  ),
	/* State 18 */ new Array(  ),
	/* State 19 */ new Array(  ),
	/* State 20 */ new Array(  ),
	/* State 21 */ new Array(  ),
	/* State 22 */ new Array(  ),
	/* State 23 */ new Array(  )
);



/* Symbol labels */
var labels = new Array(
	"begin'" /* Non-terminal symbol */,
	"WHITESPACE" /* Terminal symbol */,
	"WHITESPACE" /* Terminal symbol */,
	"LEFT_PARENTHESE" /* Terminal symbol */,
	"RIGHT_PARENTHESE" /* Terminal symbol */,
	"AND" /* Terminal symbol */,
	"OR" /* Terminal symbol */,
	"NOT" /* Terminal symbol */,
	"COLUMN" /* Terminal symbol */,
	"STRING" /* Terminal symbol */,
	"WORD" /* Terminal symbol */,
	"OPERATOR" /* Terminal symbol */,
	"search_text" /* Non-terminal symbol */,
	"begin" /* Non-terminal symbol */,
	"and_expression" /* Non-terminal symbol */,
	"boolean_expression" /* Non-terminal symbol */,
	"expression" /* Non-terminal symbol */,
	"value" /* Non-terminal symbol */,
	"string" /* Non-terminal symbol */,
	"$" /* Terminal symbol */
);


	
	info.offset = 0;
	info.src = src;
	info.att = new String();
	
	if( !err_off )
		err_off	= new Array();
	if( !err_la )
	err_la = new Array();
	
	sstack.push( 0 );
	vstack.push( 0 );
	
	la = __NODEJS_lex( info );

	while( true )
	{
		act = 25;
		for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
		{
			if( act_tab[sstack[sstack.length-1]][i] == la )
			{
				act = act_tab[sstack[sstack.length-1]][i+1];
				break;
			}
		}

		if( NODEJS__dbg_withtrace && sstack.length > 0 )
		{
			__NODEJS_dbg_print( "\nState " + sstack[sstack.length-1] + "\n" +
							"\tLookahead: " + labels[la] + " (\"" + info.att + "\")\n" +
							"\tAction: " + act + "\n" + 
							"\tSource: \"" + info.src.substr( info.offset, 30 ) + ( ( info.offset + 30 < info.src.length ) ?
									"..." : "" ) + "\"\n" +
							"\tStack: " + sstack.join() + "\n" +
							"\tValue stack: " + vstack.join() + "\n" );
		}
		
			
		//Panic-mode: Try recovery when parse-error occurs!
		if( act == 25 )
		{
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "Error detected: There is no reduce or shift on the symbol " + labels[la] );
			
			err_cnt++;
			err_off.push( info.offset - info.att.length );			
			err_la.push( new Array() );
			for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
				err_la[err_la.length-1].push( labels[act_tab[sstack[sstack.length-1]][i]] );
			
			//Remember the original stack!
			var rsstack = new Array();
			var rvstack = new Array();
			for( var i = 0; i < sstack.length; i++ )
			{
				rsstack[i] = sstack[i];
				rvstack[i] = vstack[i];
			}
			
			while( act == 25 && la != 19 )
			{
				if( NODEJS__dbg_withtrace )
					__NODEJS_dbg_print( "\tError recovery\n" +
									"Current lookahead: " + labels[la] + " (" + info.att + ")\n" +
									"Action: " + act + "\n\n" );
				if( la == -1 )
					info.offset++;
					
				while( act == 25 && sstack.length > 0 )
				{
					sstack.pop();
					vstack.pop();
					
					if( sstack.length == 0 )
						break;
						
					act = 25;
					for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
					{
						if( act_tab[sstack[sstack.length-1]][i] == la )
						{
							act = act_tab[sstack[sstack.length-1]][i+1];
							break;
						}
					}
				}
				
				if( act != 25 )
					break;
				
				for( var i = 0; i < rsstack.length; i++ )
				{
					sstack.push( rsstack[i] );
					vstack.push( rvstack[i] );
				}
				
				la = __NODEJS_lex( info );
			}
			
			if( act == 25 )
			{
				if( NODEJS__dbg_withtrace )
					__NODEJS_dbg_print( "\tError recovery failed, terminating parse process..." );
				break;
			}


			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "\tError recovery succeeded, continuing" );
		}
		
		/*
		if( act == 25 )
			break;
		*/
		
		
		//Shift
		if( act > 0 )
		{			
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "Shifting symbol: " + labels[la] + " (" + info.att + ")" );
		
			sstack.push( act );
			vstack.push( info.att );
			
			la = __NODEJS_lex( info );
			
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "\tNew lookahead symbol: " + labels[la] + " (" + info.att + ")" );
		}
		//Reduce
		else
		{		
			act *= -1;
			
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "Reducing by producution: " + act );
			
			rval = void(0);
			
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "\tPerforming semantic action..." );
			
switch( act )
{
	case 0:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 1:
	{
		 result = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 2:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 3:
	{
		 rval = mkComplexQuery('OR',[vstack[ vstack.length - 2 ],vstack[ vstack.length - 1 ]]); 
	}
	break;
	case 4:
	{
		 rval = mkComplexQuery('OR',[vstack[ vstack.length - 3 ],vstack[ vstack.length - 1 ]]); 
	}
	break;
	case 5:
	{
		 rval = vstack[ vstack.length - 1 ] ; 
	}
	break;
	case 6:
	{
		 rval = mkComplexQuery('AND',[vstack[ vstack.length - 3 ],vstack[ vstack.length - 1 ]]); 
	}
	break;
	case 7:
	{
		 rval = mkNotQuery(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 8:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 9:
	{
		 rval = vstack[ vstack.length - 2 ]; 
	}
	break;
	case 10:
	{
		 simpleQuerySetId(vstack[ vstack.length - 1 ],vstack[ vstack.length - 2 ].split(':').slice(0,-1).join(':')); rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 11:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 12:
	{
		 vstack[ vstack.length - 1 ].operator = vstack[ vstack.length - 2 ] ; rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 13:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 14:
	{
		 rval = mkSimpleQuery('',vstack[ vstack.length - 1 ]); 
	}
	break;
	case 15:
	{
		 rval = mkSimpleQuery('',vstack[ vstack.length - 1 ].split('"').slice(1,-1).join('"')); 
	}
	break;
}



			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "\tPopping " + pop_tab[act][1] + " off the stack..." );
				
			for( var i = 0; i < pop_tab[act][1]; i++ )
			{
				sstack.pop();
				vstack.pop();
			}
									
			go = -1;
			for( var i = 0; i < goto_tab[sstack[sstack.length-1]].length; i+=2 )
			{
				if( goto_tab[sstack[sstack.length-1]][i] == pop_tab[act][0] )
				{
					go = goto_tab[sstack[sstack.length-1]][i+1];
					break;
				}
			}
			
			if( act == 0 )
				break;
				
			if( NODEJS__dbg_withtrace )
				__NODEJS_dbg_print( "\tPushing non-terminal " + labels[ pop_tab[act][0] ] );
				
			sstack.push( go );
			vstack.push( rval );			
		}
		
		if( NODEJS__dbg_withtrace )
		{		
			alert( NODEJS__dbg_string );
			NODEJS__dbg_string = new String();
		}
	}

	if( NODEJS__dbg_withtrace )
	{
		__NODEJS_dbg_print( "\nParse complete." );
		alert( NODEJS__dbg_string );
	}
	
	return err_cnt;
}



var arrayExtend = function () {
    var j,i,newlist=[],listoflists = arguments;
    for (j=0; j<listoflists.length; ++j) {
        for (i=0; i<listoflists[j].length; ++i) {
            newlist.push(listoflists[j][i]);
        }
    }
    return newlist;
};
var mkSimpleQuery = function (id,value,operator) {
    return {type:'simple',operator:'=',id:id,value:value};
};
var mkNotQuery = function (query) {
    if (query.operator === 'NOT') {
        return query.query_list[0];
    }
    return {type:'complex',operator:'NOT',query_list:[query]};
};
var mkComplexQuery = function (operator,query_list) {
    var i,query_list2 = [];
    for (i=0; i<query_list.length; ++i) {
        if (query_list[i].operator === operator) {
            query_list2 = arrayExtend(query_list2,query_list[i].query_list);
        } else {
            query_list2.push(query_list[i]);
        }
    }
    return {type:'complex',operator:operator,query_list:query_list2};
};
var simpleQuerySetId = function (query, id) {
    var i;
    if (query.type === 'complex') {
        for (i = 0; i < query.query_list.length; ++i) {
            simpleQuerySetId (query.query_list[i],id);
        }
        return true;
    }
    if (query.type === 'simple' && !query.id) {
        query.id = id;
        return true;
    }
    return false;
};
var error_offsets = [];
var error_lookaheads = [];
var error_count = 0;
var result;
if ( ( error_count = __NODEJS_parse( string, error_offsets, error_lookaheads ) ) > 0 ) {
    var i;
    for (i = 0; i < error_count; ++i) {
        throw new Error ( "Parse error near \"" +
                          string.substr ( error_offsets[i] ) +
                          "\", expecting \"" +
                          error_lookaheads[i].join() + "\"" );
    }
}

  return result;
  }

});
Object.defineProperty(scope.ComplexQueries,"serialize",{
    configurable:false,enumerable:false,writable:false,value:function(query){
        var str_list = [], i;
        if (query.type === 'complex') {
            str_list.push ( '(' );
            for (i=0; i<query.query_list.length; ++i) {
                str_list.push( scope.ComplexQueries.serialize(query.query_list[i]) );
                str_list.push( query.operator );
            }
            str_list.length --;
            str_list.push ( ')' );
            return str_list.join(' ');
        } else if (query.type === 'simple') {
            return query.id + (query.id?': ':'') + query.operator + ' "' + query.value + '"';
        }
        return query;
    }
});
Object.defineProperty(scope.ComplexQueries,"query",{
    configurable:false,enumerable:false,writable:false,
    value: function (query, object_list) {
        var wildcard_character = typeof query.wildcard_character === 'string' ?
            query.wildcard_character : '%',
        operator_actions = {
            '=':   function (value1, value2) {
                value1 = '' + value1;
                return value1.match (convertToRegexp (
                    value2, wildcard_character
                )) || false && true;
            },
            '!=':  function (value1, value2) {
                value1 = '' + value1;
                return !(value1.match (convertToRegexp (
                    value2, wildcard_character
                )));
            },
            '<':   function (value1, value2) { return value1 < value2; },
            '<=':  function (value1, value2) { return value1 <= value2; },
            '>':   function (value1, value2) { return value1 > value2; },
            '>=':  function (value1, value2) { return value1 >= value2; },
            'AND': function (item, query_list) {
                var i;
                for (i=0; i<query_list.length; ++i) {
                    if (! itemMatchesQuery (item, query_list[i])) {
                        return false;
                    }
                }
                return true;
            },
            'OR':  function (item, query_list) {
                var i;
                for (i=0; i<query_list.length; ++i) {
                    if (itemMatchesQuery (item, query_list[i])) {
                        return true;
                    }
                }
                return false;
            },
            'NOT': function (item, query_list) {
                return !itemMatchesQuery(item, query_list[0]);
            }
        },
        convertToRegexp = function (string) {
            return subString('^' + string.replace(
                new RegExp(
                    '([\\{\\}\\(\\)\\^\\$\\&\\.\\*\\?\\\/\\+\\|\\[\\]\\-\\\\])'.
                        replace (wildcard_character?
                                 '\\'+wildcard_character:undefined,''),
                    'g'
                ),
                '\\$1'
            ) + '$',(wildcard_character||undefined), '.*');
        },
        subString = function (string, substring, newsubstring) {
            var res = '', i = 0;
            if (substring === undefined) {
                return string;
            }
            while (1) {
                var tmp = string.indexOf(substring,i);
                if (tmp === -1) {
                    break;
                }
                for (; i < tmp; ++i) {
                    res += string[i];
                }
                res += newsubstring;
                i += substring.length;
            }
            for (; i<string.length; ++i) {
                res += string[i];
            }
            return res;
        },
        itemMatchesQuery = function (item, query_object) {
            var i;
            if (query_object.type === 'complex') {
                return operator_actions[query_object.operator](
                    item, query_object.query_list
                );
            } else {
                if (query_object.id) {
                    if (typeof item[query_object.id] !== 'undefined') {
                        return operator_actions[query_object.operator](
                            item[query_object.id], query_object.value
                        );
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            }
        },
        select = function (list, select_list) {
            var i;
            if (select_list.length === 0) {
                return;
            }
            for (i=0; i<list.length; ++i) {
                var list_value = {}, k;
                for (k=0; k<select_list.length; ++k) {
                    list_value[select_list[k]] =
                        list[i][select_list[k]];
                }
                list[i] = list_value;
            }
        },
        sortFunction = function (key, asc) {
            if (asc === 'descending') {
                return function (a,b) {
                    return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0;
                };
            }
            return function (a,b) {
                return a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
            };
        },
        mergeList = function (list, list_to_merge, index) {
            var i,j;
            for (i = index,j = 0; i < list_to_merge.length + index; ++i, ++j) {
                list[i] = list_to_merge[j];
            }
        },
        sort = function (list, sort_list) {
            var i, tmp, key, asc, sortAndMerge = function() {
                sort(tmp,sort_list.slice(1));
                mergeList(list,tmp,i-tmp.length);
                tmp = [list[i]];
            };
            if (list.length < 2) {
                return;
            }
            if (sort_list.length === 0) {
                return;
            }
            key = sort_list[0][0];
            asc = sort_list[0][1];
            list.sort (sortFunction (key,asc));
            tmp = [list[0]];
            for (i = 1; i < list.length; ++i) {
                if (tmp[0][key] === list[i][key]) {
                    tmp.push(list[i]);
                } else {
                    sortAndMerge();
                }
            }
            sortAndMerge();
        },
        limit = function (list, limit_list) {
            var i;
            if (typeof limit_list[0] !== 'undefined') {
                if (typeof limit_list[1] !== 'undefined') {
                    if (list.length > limit_list[1] + limit_list[0]) {
                        list.length = limit_list[1] + limit_list[0];
                    }
                    list.splice(0,limit_list[0]);
                } else {
                    list.length = limit_list[0];
                }
            }
        },
        ////////////////////////////////////////////////////////////
        result_list = [], result_list_tmp = [], j;
        object_list = object_list || [];
        if (query.query === undefined) {
            result_list = object_list;
        } else {
          for (j=0; j<object_list.length; ++j) {
              if ( itemMatchesQuery (
                  object_list[j], scope.ComplexQueries.parse (query.query)
              )) {
                  result_list.push(object_list[j]);
              }
          }
        }
        if (query.filter) {
            select(result_list,query.filter.select_list || []);
            sort(result_list,query.filter.sort_on || []);
            limit(result_list,query.filter.limit || []);
        }
        return result_list;
    }
});

}(jIO));
