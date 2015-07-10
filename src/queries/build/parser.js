
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
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 8 ) || ( info.src.charCodeAt( pos ) >= 10 && info.src.charCodeAt( pos ) <= 31 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || info.src.charCodeAt( pos ) == 59 || ( info.src.charCodeAt( pos ) >= 63 && info.src.charCodeAt( pos ) <= 64 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 9 ) state = 2;
		else if( info.src.charCodeAt( pos ) == 40 ) state = 3;
		else if( info.src.charCodeAt( pos ) == 41 ) state = 4;
		else if( info.src.charCodeAt( pos ) == 60 || info.src.charCodeAt( pos ) == 62 ) state = 5;
		else if( info.src.charCodeAt( pos ) == 33 ) state = 11;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 12;
		else if( info.src.charCodeAt( pos ) == 32 ) state = 13;
		else if( info.src.charCodeAt( pos ) == 61 ) state = 14;
		else if( info.src.charCodeAt( pos ) == 34 ) state = 15;
		else if( info.src.charCodeAt( pos ) == 65 ) state = 19;
		else if( info.src.charCodeAt( pos ) == 78 ) state = 20;
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
		if( info.src.charCodeAt( pos ) == 61 ) state = 14;
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
		if( info.src.charCodeAt( pos ) == 34 ) state = 7;
	else if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 91 ) || ( info.src.charCodeAt( pos ) >= 93 && info.src.charCodeAt( pos ) <= 254 ) || info.src.charCodeAt( pos ) > 255 ) state = 15;
		else if( info.src.charCodeAt( pos ) == 92 ) state = 17;
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
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 254 ) ) state = 15;
		else state = -1;
		break;

	case 18:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 84 ) state = 10;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 19:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 78 ) state = 16;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 20:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 31 ) || info.src.charCodeAt( pos ) == 33 || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 42 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 59 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 254 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 58 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 18;
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
		 simpleQuerySetKey(vstack[ vstack.length - 1 ],vstack[ vstack.length - 2 ].split(':').slice(0,-1).join(':')); rval = vstack[ vstack.length - 1 ]; 
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
  var j, i, newlist = [], list_list = arguments;
  for (j = 0; j < list_list.length; j += 1) {
    for (i = 0; i < list_list[j].length; i += 1) {
      newlist.push(list_list[j][i]);
    }
  }
  return newlist;

}, mkSimpleQuery = function (key, value, operator) {
  var object = {"type": "simple", "key": key, "value": value};
  if (operator !== undefined) {
    object.operator = operator;
  }
  return object;

}, mkNotQuery = function (query) {
  if (query.operator === "NOT") {
    return query.query_list[0];
  }
  return {"type": "complex", "operator": "NOT", "query_list": [query]};

}, mkComplexQuery = function (operator, query_list) {
  var i, query_list2 = [];
  for (i = 0; i < query_list.length; i += 1) {
    if (query_list[i].operator === operator) {
      query_list2 = arrayExtend(query_list2, query_list[i].query_list);
    } else {
      query_list2.push(query_list[i]);
    }
  }
  return {type:"complex",operator:operator,query_list:query_list2};

}, simpleQuerySetKey = function (query, key) {
  var i;
  if (query.type === "complex") {
    for (i = 0; i < query.query_list.length; ++i) {
      simpleQuerySetKey (query.query_list[i],key);
    }
    return true;
  }
  if (query.type === "simple" && !query.key) {
    query.key = key;
    return true;
  }
  return false;
},
  error_offsets = [],
  error_lookaheads = [],
  error_count = 0,
  result;

if ((error_count = __NODEJS_parse(string, error_offsets, error_lookaheads)) > 0) {
  var i;
  for (i = 0; i < error_count; i += 1) {
    throw new Error("Parse error near \"" +
                    string.substr(error_offsets[i]) +
                    "\", expecting \"" +
                    error_lookaheads[i].join() + "\"");
  }
}

