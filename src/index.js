import { decompressSync } from 'fflate';

export default {
	async fetch(request, env, ctx) {
		const botAccessToken = env.SLACK_BOT_ACCESS_TOKEN;
		const botAccessChannel = env.SLACK_BOT_ACCESS_CHANNEL;
		const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000)).toLocaleString({ timeZone: 'Asia/Tokyo' });

		const massiveFileBuf = await request.arrayBuffer();
		//console.log(massiveFileBuf);
		var enc = new TextDecoder("utf-8");

		const compressed = new Uint8Array(massiveFileBuf);
		//console.log(`compressed = ${compressed}`);
		//console.log(`compressed decode =${enc.decode(compressed)}`);
		if (enc.decode(compressed).trim() == '{"content":"test","filename":"test.txt"}') {
			//console.log('aaa')
			var json = '{"content":"test","filename":"test.txt"}';
			//console.log(`json = ${json}`);
		} else {
			//console.log('bbb')
			const decompressed = decompressSync(compressed);
			//console.log(`decompressed = ${decompressed}`);
			//console.log(`decompressed decode =${enc.decode(decompressed)}`);
			var json = '[' + enc.decode(decompressed).trim().replace(/\n/g, ',') + ']';
			//console.log(`json = ${json}`);
		}

		const jsonobj = JSON.parse(json);
		//console.log(`jsonobj = ${jsonobj}`);
		const jsonfmt = JSON.stringify(jsonobj, null, 2);
		//console.log(`jsonfmt = ${jsonfmt}`);

		/*
		const slackUrl = 'https://slack.com/api/chat.postMessage';
		const payload = {
			channel: botAccessChannel,
			attachments: [
				{
					title: "Cloudflare Workers",
					text: `This is HTTP Requests Logpush POST \`\`\`${jsonfmt}\`\`\` `,
					author_name: "logpush-http-requests-slack",
					color: "#00FF00",
				},
			],
		};
		
		return await fetch(slackUrl, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Length": payload.length,
				Authorization: `Bearer ${botAccessToken}`,
				Accept: "application/json",
			},
		});
		*/

		const slackUrl = 'https://slack.com/api/files.upload';
		const data = {
			channels: botAccessChannel,
			filename: 'logpush-http-requests-slack.json',
			content: jsonfmt,
			filetype: json,
			initial_comment: `${jstNow} JST (${new Date()})`,
		};

		// formDataの組み立て
		const formData = new FormData();
		for (let key in data) {
			formData.append(key, data[key]);
		}

		return await fetch(slackUrl, {
			method: "POST",
			body: formData,
			headers: {
				Authorization: `Bearer ${botAccessToken}`,
			},
		});
	},
};