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
