const fs = require("fs");
const dns = require('dns');

// 네임서버를 로컬 DNS 서버로 지정
dns.setServers(['127.0.0.1']);

// 셈플 데이터셋, 실험 파라메터 설정
var args = require("args-parser")(process.argv);
var data_set = JSON.parse(fs.readFileSync('dataset.txt'));
var data_set_length = data_set.length;

var max_trial_count = args["q"];	// 한 회당 쿼리 전송 수
var max_repeat_count = args["n"];	// 실험 반복횟 수 

// 실험값 범위 체크
if (  max_trial_count == null || max_repeat_count == null || max_trial_count < 1 || max_repeat_count < 1)
{
	console.log("q, n parameter should be larger than 0");
	return;
}

// 실험값 초기화
var trial_count = 0;
var total_test_record = [];
var repeat_count = 0;
var test_record = [];
var result = 
{
	total_test_trial: 0, 
	delay: 
	{
		min: 999999999,
		max: 0,
		avg: 0,
		sum: 0
	},
	query_per_sec:
	{
		min: 999999999,
		max: 0,
		avg: 0,
		sum: 0
	},
	success:0,
	fail:0
};


// 실험 시작
unit_test();

function unit_test()
{

	// 테스트가 진행되는 동안 trial_count 를 1씩 증가

	var query_start_time = new Date();
	query_start_time = query_start_time.getTime();

	trial_count = trial_count + 1;


	// 데이터 셋에서 랜덤하게 1개의 레코드에 대해 쿼리
	var random_number = getRandomInt(data_set_length);
	var random_record = data_set[random_number].record;
	var random_output = data_set[random_number].service;

	dns.resolveNaptr(random_record, function(err, addresses)
	{

		// 쿼리 지연시간 계산
		query_reply_time = new Date();
		query_reply_time = query_reply_time.getTime();
		var query_delay =  (query_reply_time - query_start_time)/1000;

		// 현재 테스트 상황 출력
		// console.log("TEST #" + trial_count + " delay:"  + query_delay + "sec");

		// 결과를 테스트 레코드에 기록
		test_record.push(
		{
			"query_start_time": query_start_time, 
			"query_reply_time": query_reply_time,
			"random_record": random_record,
			"random_output": random_output,			
			"result": addresses
		});

		if (trial_count < max_trial_count)
		{
			// 테스트가 max_trial_count가 될때까지 재귀적으로 반복			
			unit_test();
		}
		else
		{

			// 결과값 연산
			var total_delay = ((test_record[max_trial_count-1].query_reply_time - test_record[0].query_start_time)/1000);
			var query_per_sec = ( trial_count /  total_delay);

			// 각 쿼리의 정확도 체크
			var success_count = 0;
			for (var i=0; i< test_record.length; i++)
			{
				if (test_record[i].random_output == test_record[i].result[0].service)
				{
					success_count = success_count + 1;
				}
			}

			// 중간 결과 출력
			console.log("\n=======================================");
			console.log("TEST RESULT #" + repeat_count);
			console.log("=======================================");
			console.log("total_query: " + test_record.length);
			console.log("total_delay: " +  total_delay + "sec");
			console.log("query / sec: " + query_per_sec );
			console.log("success: " + success_count + "  fail:" + (trial_count-success_count));


			// 로그 저장
			test_record.push({
				"total_query": trial_count,
				"total_delay": total_delay,
				"query_per_sec": query_per_sec,
				"success": success_count,
				"fail": (trial_count-success_count)
			});

			total_test_record.push(test_record);

			// 실험 반복횟수가 남았다면 1초 후 다음 실험 진행
			if (repeat_count < max_repeat_count )
			{

				repeat_count = repeat_count + 1;
				trial_count = 0;
				test_record = [];

				setTimeout(function()
				{
					unit_test();
				}, 1000);
			}
			else
			{

				// 최종 결과 연산 (평균, 최대, 최소)

				for (var i=0; i < total_test_record.length; i++)
				{

					var current_summary = total_test_record[i][total_test_record[i].length-1];
					result.total_test_trial = result.total_test_trial + current_summary.total_query;
					result.delay.sum = result.delay.sum + current_summary.total_delay;
					result.query_per_sec.sum = result.query_per_sec.sum + current_summary.query_per_sec;
					result.success = result.success + current_summary.success;
					result.fail = result.fail + current_summary.fail;


					if (result.delay.min > current_summary.total_delay)
					{
						result.delay.min = current_summary.total_delay;
					}

					if (result.delay.max < current_summary.total_delay)
					{
						result.delay.max = current_summary.total_delay;
					}

					if (result.query_per_sec.min > current_summary.query_per_sec)
					{
						result.query_per_sec.min = current_summary.query_per_sec;
					}

					if (result.query_per_sec.max < current_summary.query_per_sec)
					{
						result.query_per_sec.max = current_summary.query_per_sec;
					}

				}

				result.delay.avg = result.delay.sum / total_test_record.length;
				result.query_per_sec.avg = result.query_per_sec.sum / total_test_record.length;				


				// 결과 출력

				console.log("=======================================");
				console.log("TEST SUMMARY");
				console.log("=======================================");
				console.log("total test trial: " + result.total_test_trial);
				console.log("delay: ");
				console.log( result.delay.avg + "sec (avg) ");
				console.log( result.delay.min + "sec (min) ");
				console.log( result.delay.max + "sec (max)");
				console.log("query / sec: ");
				console.log( result.query_per_sec.avg + "(avg) "); 
				console.log( result.query_per_sec.max + "(max) ");
				console.log( result.query_per_sec.min + "(min)");
				console.log("success: " + result.success + "  fail: " + result.fail);

				// 실험 결과를 output.txt에 저장
				total_test_record.push(result);
				fs.writeFileSync("output.text", JSON.stringify(total_test_record), 'utf8');

			}

		}

	});	
}

function getRandomInt(max)
{
    return Math.floor(Math.random() * max );
}