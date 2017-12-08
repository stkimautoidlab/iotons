var fs = require('fs');
var data = fs.readFileSync('/etc/bind/ddb.onsepc.me', 'utf8');
var Hashids = require('hashids');
var hashids = new Hashids('', 10);
var db_setting_string = ";\n; BIND data file for local loopback interface\n;\n$TTL    60\n@       IN      SOA     ns.onsepc.me.    root.onspec.me. (\n                              2         ; Serial\n                         604800         ; Refresh\n                          86400         ; Retry\n                        2419200         ; Expire\n                         800 )  ; Negative Cache TTL\n;\n@       IN      NS      ns.onsepc.me.\n@       IN      NS      ns2.onsepc.me.\nns      IN      A       127.0.0.1\nns2     IN      A       127.0.0.1\nwww     IN      A       52.79.69.231\n";
var option = JSON.parse(fs.readFileSync('./setting.json', 'utf8'));
var exec = require('child_process').exec;


// initialize id info
// ==============================================================
var id_dict = {};
id_dict.gs1 = {gtin: 0, gln: 1, sscc: 2, grai: 3, giai: 4, gsrn: 5, gdti: 6, ginc: 7, gsin: 8, gcn: 9, cpid: 10};
id_dict.ki = {idproject: 6, pedigree: 7, ai: 8, traceability: 9};
id_dict.gs1_r = {};
id_dict.ki_r = {};

var naptr_record_dict = {};

for (key in id_dict.gs1)
{
	id_dict.gs1_r[id_dict.gs1[key]] = key;
}

for (key in id_dict.ki)
{
	id_dict.ki_r[id_dict.ki[key]] = key;
}


for (key in id_dict.ki)
{
	naptr_record_dict[key] = {};

	for (project in naptr_record_dict)
	{
		for (id_key in id_dict.gs1)
		{
			naptr_record_dict[project][id_key] = {};
		}
	}
}

function parse_bind_db (data)
{
	var data = data.split("\n");
	var current_id = {gs1:-1, ki:-1};

	for (var i = 0; i < data.length; i++)
	{

		if(data[i].startsWith("$ORIGIN") == true)
		{
			var current_origin = data[i].split(".");
			if (current_origin.length == 16)
			{
				current_id.ki = current_origin[0].split(" ")[1];
				current_id.gs1 = current_origin[10];
				continue;
			}
		}
		else if (data[i].includes("IN NAPTR") == true)
		{
			var current_data = data[i].split(" ");
			var current_index = current_data[9].replace(";", "");


			for (var j = 0; j < current_data.length; j++)
			{
				console.log(current_data[j]);
				current_data[j] = current_data[j].replace("\"", "");
				current_data[j] = current_data[j].replace("\"", "");				
				console.log(current_data[j]);				
			}


			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index] = {};
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].record = current_data[0];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].order = current_data[3];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].pref = current_data[4];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].flag = current_data[5];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].service = current_data[6];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].regexp = current_data[7];
			naptr_record_dict[id_dict.ki_r[current_id.ki]][current_id.gs1][current_index].index = current_index;
		}
	}
}

function add_record(data)
{

	var result = {test:false, msg:""};

	if (naptr_record_dict[data.project])
	{
		if (naptr_record_dict[data.project][data.idtype])
		{
			var duplicated_record_test = true;
			var current_id;			

			for (item in naptr_record_dict[data.project][data.idtype])
			{
				if (naptr_record_dict[data.project][data.idtype][item].record == data.record)
				{
					duplicated_record_test = false;
					current_id = item;
					break;
				}
			}

			if (duplicated_record_test)
			{
				current_id = hashids.encode(option.count*2);
				option.count = option.count + 1;
				fs.writeFileSync('./setting.json', JSON.stringify(option));

				naptr_record_dict[data.project][data.idtype][current_id] = {};
				naptr_record_dict[data.project][data.idtype][current_id].index = current_id;
				naptr_record_dict[data.project][data.idtype][current_id].record = data.record;
				naptr_record_dict[data.project][data.idtype][current_id].order = data.order;
				naptr_record_dict[data.project][data.idtype][current_id].pref = data.pref;
				naptr_record_dict[data.project][data.idtype][current_id].flag = data.flag;
				naptr_record_dict[data.project][data.idtype][current_id].service = data.service;
				naptr_record_dict[data.project][data.idtype][current_id].regexp = data.regexp;
				result.test = true;
				result.msg = current_id;
				update_record();
				return result;

			}
			else
			{
				result.test = false;
				result.msg = "record duplicated";
				return result;				
			}

		}
		else
		{
			result.test = false;
			result.msg = "idtype not defined";
			return result;
		}
	}
	else
	{
		result.test = false;
		result.msg = "project not defined";
		return result;		
	}

}


function remove_record(data)
{

	var result = {test:false, msg:""};

	if (naptr_record_dict[data.project])
	{
		if (naptr_record_dict[data.project][data.idtype])
		{
			if (naptr_record_dict[data.project][data.idtype][data.index])
			{
				delete naptr_record_dict[data.project][data.idtype][data.index];
				result.test = true;
				result.msg = "removed";
				update_record();
			}
			else
			{
				result.test = false;
				result.msg = "data not exists";
			}
		}
		else
		{
			result.test = false;
			result.msg = "idtype not defined";
		}
	}
	else
	{
		result.test = false;
		result.msg = "project not defined";		
	}	

	return result;

}

function edit_record(data)
{

	var result = {test:false, msg:""};

	if (naptr_record_dict[data.project])
	{
		if (naptr_record_dict[data.project][data.idtype])
		{
			if (naptr_record_dict[data.project][data.idtype][data.index])
			{
				naptr_record_dict[data.project][data.idtype][data.index].order = data.order;
				naptr_record_dict[data.project][data.idtype][data.index].pref = data.pref;
				naptr_record_dict[data.project][data.idtype][data.index].flag = data.flag;
				naptr_record_dict[data.project][data.idtype][data.index].service = data.service;
				naptr_record_dict[data.project][data.idtype][data.index].regexp = data.regexp;
				result.test = true;
				result.msg = data.index;
				update_record();				
				return result;
			}
			else
			{
				result.test = false;
				result.msg = "data not exists";
				return result;
			}
		}
		else
		{
			result.test = false;
			result.msg = "idtype not defined";
			return result;
		}
	}
	else
	{
		result.test = false;
		result.msg = "project not defined";
		return result;
	}
}


function update_record()
{
	var result = db_setting_string;

	for (project in naptr_record_dict)
	{
		for(id_key in naptr_record_dict[project])
		{
			result = result + "$ORIGIN " + id_dict.ki[project].toString() + ".9.9.6.2.0.0.0.8.8." + id_key + ".gs1.id.onsepc.me.\n";
			for (entry in naptr_record_dict[project][id_key])
			{
				result = result + naptr_record_dict[project][id_key][entry].record + " IN NAPTR " + naptr_record_dict[project][id_key][entry].order.toString() + " " + naptr_record_dict[project][id_key][entry].pref.toString() + " \"" + naptr_record_dict[project][id_key][entry].flag + "\" \"" + naptr_record_dict[project][id_key][entry].service + "\" \"" + naptr_record_dict[project][id_key][entry].regexp + "\" . ;" + naptr_record_dict[project][id_key][entry].index + "\n";
			}
		}
	}

	fs.writeFile('/etc/bind/ddb.onsepc.me', result, function()
	{
	
		var cmd = 'sudo service bind9 restart';

		exec(cmd, function(error, stdout, stderr)
		{
			console.log("done");
		});

	});

}

function show_record(project, idtype, index, count)
{
	var result = {test:"", msg:""};

	if (naptr_record_dict[project])
	{
		if (idtype == "*")
		{
			result.test = true;
			result.msg = {'success':{}};

			if (index == null)
			{
				index = 0;
			}

			if (count == null)
			{
				count = 0;
			}

			var current_index = 0;			

			for (id_key in naptr_record_dict[project])
			{
				result.msg.success[id_key] = [];

				for (entry in naptr_record_dict[project][id_key])
				{
					if (current_index >= index)
					{
						if (count == 0 || current_index < index + count)
						{
							result.msg.success[id_key].push(naptr_record_dict[project][id_key][entry]);
						}
					}
					current_index = current_index + 1;
				}				

			}

			result.msg = JSON.stringify(result.msg);

		}
		else if (naptr_record_dict[project][idtype])
		{
			result.test = true;
			result.msg = {'success':{}};
			result.msg.success[idtype] = [];

			if (index == null)
			{
				index = 0;
			}

			if (count == null)
			{
				count = 0;
			}

			var current_index = 0;

			for (entry in naptr_record_dict[project][idtype])
			{
				if (current_index >= index)
				{
					if (count == 0 || current_index < index + count)
					{
						result.msg.success[idtype].push(naptr_record_dict[project][idtype][entry]);
					}
				}
				current_index = current_index + 1;
			}

			result.msg = JSON.stringify(result.msg);
		}
		else
		{
			result.test = false;
			result.msg = "{'error':'idtype not exists':}";
		}
	}
	else
	{
		result.test = false;
		result.msg = "{'error':'project not exists':}";
	}

	return result;
}


parse_bind_db(data);

exports.update_record = update_record;
exports.edit_record = edit_record;
exports.remove_record = remove_record;
exports.add_record = add_record;
exports.parse_bind_db = parse_bind_db;
exports.naptr_record_dict = naptr_record_dict;
exports.show_record = show_record;