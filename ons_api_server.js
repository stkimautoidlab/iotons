var fs = require('fs');
var ons_manage = require("./ons_management.js");
var account = JSON.parse(fs.readFileSync('./account.json', 'utf8'));

/*
var new_data = {project:"traceability", idtype:"gtin", record: "", order: "", pref: "", flag: "", service: "asdf", regexp: ""};
var return_id = ons_manage.add_record(new_data);

console.log(ons_manage.naptr_record_dict);
console.log(return_id);


new_data = {project:"traceability", idtype:"gtin", index: return_id};
ons_manage.remove_record(new_data);

console.log(ons_manage.naptr_record_dict);

//update_record();
*/


function check_account(query)
{

    var result = {test:false, msg:""};

    if (query.api_key)
    {

        if (query.project)
        {

            var api_key = query.api_key;
            var project = query.project;
            var key_test = 0;

            if (account[api_key])
            {

                var project_test = false;

                // check the api_key has permission to project

                for (var i = 0; i < account[api_key].project.length; i++)
                {
                    if (project == account[api_key].project[i])
                    {
                        project_test = true;
                        break;
                    }
                }

                if (project_test == true)
                {
                    // api_key has permission
                    key_test = 1;
                }
                else
                {
                    // api_key has no permission
                    key_test = -2;
                }
            }
            else
            {
                // api_key is not valid        
                key_test = -1;
            }


            if (key_test == 1)
            {
                result.test = true;
            }
            else if  (key_test == -1)
            {
                result.test = false;
                result.msg = "{'error':'invalid api key'}";
            }
            else if  (key_test == -2)
            {
                result.test = false;                
                result.msg = "{'error':'permission denied'}";
            }
            else
            {
                result.test = false;                
                result.msg = "{'error':'unknown error'}";
            }
        }
        else
        {
            result.test = false;            
            result.msg = "{'error':'project is required'}";
        }


    }
    else
    {
        result.test = false;        
        result.msg = "{'error':'api_key is required'}";
    }

    return result;

} 

function check_record (record)
{

    var result = {test:false, msg:""};

    if (record[record.length-1] == "." || record[0] == ".")
    {
        console.log(" '.'' seperator usage error ");
    }

    var token_list = record.split(".");

    for (var i = 0; i < token_list.length; i++)
    {

        if (token_list[i].length == 1)
        {
            token_list[i] = token_list[i].toLowerCase();

            if (token_list[i].match(/[a-z]/i) || token_list[i].match(/[0-9]/i))
            {
                result.test = true;
                console.log("ok");
            }
            else if (token_list[i] == "*")
            {
                if (i == 0)
                {
                    result.test = true;
                    console.log("ok");
                }
                else
                {
                    result.test = false;
                    result.msg = "wildcard(*) is allowed in leftmost position only";
                }
            }
            else
            {
                result.test = false;
                result.msg = " record element should be 1 charater (0-9, A-Z, *) ";
            }
        }
        else
        {
            result.test = false;
            result.msg = " record element should be 1 charater (0-9, A-Z, *) ";
        }
    }

    return result;

}

function check_parameter (query, test_type)
{

    var error_parameter = [];

    if ( (test_type == "remove" || test_type == "edit") && query.index == null)
    {
        error_parameter.push("index required");
    }

    if (test_type != "remove")
    {

        if (query.record == null)
        {
            error_parameter.push("record");
        }
        else
        {
            var record_test = check_record(query.record);
            if (record_test.test == false)
            {
                error_parameter.push(record_test.msg);
            }
        }

        var order_t = parseInt(query.order);  
        if ( query.order == null )
        {
            error_parameter.push("order");
        }
        else if (order_t < 0 || isNaN(order_t) )
        {
            error_parameter.push("order should be positive integer >=0 ");
        }

        var pref_t = parseInt(query.pref);            

        if (query.pref == null)
        {
            error_parameter.push("pref");
        }
        else if (pref_t < 0 || isNaN(pref_t) )
        {
            error_parameter.push("pref should be positive integer >=0 ");
        }

        if (query.flag == null)
        {
            error_parameter.push("flag");
        }
        else if (!(query.flag == "u" || query.flag == "t" || query.flag == "U" || query.flag == "T"))
        {
            error_parameter.push("flag should be 't' or 'u'");
        } 

        if (query.service == null)
        {
            error_parameter.push("service");
        }

        if (query.regexp == null)
        {
            query.regexp = "";
        }

    }

    return error_parameter;

}


const Hapi = require('hapi');

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({ 
    port: 80
});

server.route({
    method: 'GET',
    path: '/index.html',
    handler:  function (request, reply)
    {
        reply.file('./www/index.html');
    }
});

server.route({
    method: 'GET',
    path: '/index.htm',
    handler:  function (request, reply)
    {
        reply.file('./www/index.html');
    }
});

server.route({
    method: 'GET',
    path: '/',
    handler:  function (request, reply)
    {
        reply.file('./www/index.html');
    }
});

server.route({
    method: 'GET',
    path: '/css/bootstrap.min.css',
    handler:  function (request, reply)
    {
        reply.file('./www/css/bootstrap.min.css');
    }
});

server.route({
    method: 'GET',
    path: '/css/docs.min.css',
    handler:  function (request, reply)
    {
        reply.file('./www/css/docs.min.css');
    }
});

server.route({
    method: 'GET',
    path: '/css/index.html',
    handler:  function (request, reply)
    {
        reply.file('./www/index.html');
    }
});



server.route({
    method: 'GET',
    path:'/show_naptr_record', 
    handler: function (request, reply)
    {

        var result = "";

        var query_check = check_account(request.query);

        if (query_check.test == true)
        {
            var result = ons_manage.show_record(request.query.project, request.query.idtype, request.query.start, request.query.count);
            return reply(result.msg);
        }
        else
        {
            return reply(query_check.msg);            
        }
    }
});


server.route({
    method: 'GET',
    path:'/add_naptr_record',
    handler: function (request, reply)
    {

        var result = "";

        var query_check = check_account(request.query);

        if (query_check.test == true)
        {

            var parameter_test = check_parameter(request.query, "add");

            if (parameter_test.length > 0)
            {
                var result = JSON.stringify({"error":"following parameters should be reviewed for the naptr record: " + JSON.stringify(parameter_test)});
                return reply(result);
            }
            else
            {
                var new_data = {project:request.query.project, idtype:request.query.idtype, record: request.query.record, order: request.query.order, pref: request.query.pref, flag: request.query.flag, service: request.query.service, regexp: request.query.regexp};
                var return_id = ons_manage.add_record(new_data);
                if (return_id.test == true)
                {
                    return reply("{'success':{'record-id':" + return_id.msg + "}");
                }
                else
                {
                    return reply("{'error':'" + return_id.msg + "'}");
                }

            }
        }
        else
        {
            return reply(query_check.msg);
        }
    }
});

// http://www.onsepc.me/add_naptr_record?api_key=expanne&project=traceability&idtype=gtin&record=0.1&flag=u&pref=%220%22&order=%220%22&regexp=%22%22

server.route({
    method: 'GET',
    path:'/edit_naptr_record',
    handler: function (request, reply)
    {

        var result = "";

        var query_check = check_account(request.query);

        if (query_check.test == true)
        {

            var parameter_test = check_parameter(request.query, "edit");

            if (parameter_test.length > 0)
            {
                var result = JSON.stringify({"error":"following parameters should be reviewed for the naptr record: " + JSON.stringify(parameter_test)});
                return reply(result);
            }
            else
            {
                var new_data = {project:request.query.project, idtype:request.query.idtype, record: request.query.record, order: request.query.order, pref: request.query.pref, flag: request.query.flag, service: request.query.service, regexp: request.query.regexp, index: request.query.index};

                var return_id = ons_manage.edit_record(new_data);
                if (return_id.test == true)
                {
                    return reply("{'success':{'record-id':" + return_id.msg + "}");
                }
                else
                {
                    return reply("{'error':'" + return_id.msg + "'}");
                }

            }
        }
        else
        {
            return reply(query_check.msg);
        }
    }
});


server.route({
    method: 'GET',
    path:'/remove_naptr_record',
    handler: function (request, reply)
    {

        var result = "";

        var query_check = check_account(request.query);

        if (query_check.test == true)
        {

            var parameter_test = check_parameter(request.query, "remove");

            if (parameter_test.length > 0)
            {
                var result = JSON.stringify({"error":"following parameters should be reviewed for the naptr record: " + JSON.stringify(parameter_test)});
                return reply(result);
            }
            else
            {

                var new_data = {project:request.query.project, idtype:request.query.idtype, record: request.query.record, order: request.query.order, pref: request.query.pref, flag: request.query.flag, service: request.query.service, regexp: request.query.regexp, index: request.query.index};
                var return_id = ons_manage.remove_record(new_data);
                if (return_id.test == true)
                {
                    return reply("{'success':{'record-id':" + return_id.msg + "}");
                }
                else
                {
                    return reply("{'error':'" + return_id.msg + "'}");
                }

            }
        }
        else
        {
            return reply(query_check.msg);
        }
    }
});


server.register(require('inert'), (err) => {

    // Start the server
    server.start((err) => {

        if (err)
        {
            throw err;
        }

        console.log('Server running at:', server.info.uri);

    });
});
