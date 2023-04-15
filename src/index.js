import { decompressSync } from 'fflate';

export default {
	async fetch(request, env, ctx) {
		const massiveFileBuf = await request.arrayBuffer();
		//console.log(massiveFileBuf);
		var enc = new TextDecoder("utf-8");

		const PRESHARED_AUTH_HEADER_KEY = 'X-Logpush-Auth';
		const PRESHARED_AUTH_HEADER_VALUE = 'mypresharedkey';

		const psk = request.headers.get(PRESHARED_AUTH_HEADER_KEY);
		//console.log(psk)

		if (psk !== PRESHARED_AUTH_HEADER_VALUE) {
			return new Response('Sorry, you have supplied an invalid key.', {
				status: 403,
			});
		}

		const compressed = new Uint8Array(massiveFileBuf);
		//console.log(`compressed = ${compressed}`);
		//console.log(`compressed decode =${enc.decode(compressed)}`);
		if (enc.decode(compressed).trim() == '{"content":"test","filename":"test.txt"}') {
			//console.log('aaa')
			var json = '[{"content":"test","filename":"test.txt"}]';
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

		const responses = await Promise.all(jsonobj.map(async jsonelem => {
			//console.log(jsonelem)
			const jsonfmt = JSON.stringify(jsonelem, null, 2);
			//console.log(`jsonfmt = ${jsonfmt}`);

			const botAccessChannel = env.SLACK_BOT_ACCESS_CHANNEL;
			const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000)).toLocaleString({ timeZone: 'Asia/Tokyo' });
			const payload = {
				channel: botAccessChannel,
				attachments: [
					{
						title: "Cloudflare Workers - Logpush POST",
						text: `${jstNow} JST (${new Date()}) \`\`\`${jsonfmt}\`\`\` `,
						author_name: "logpush-slack",
						color: "#00FF00",
					},
				],
			};
			const botAccessToken = env.SLACK_BOT_ACCESS_TOKEN;
			fetch('https://slack.com/api/chat.postMessage', {
				method: "POST",
				body: JSON.stringify(payload),
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Content-Length": payload.length,
					Authorization: `Bearer ${botAccessToken}`,
					Accept: "application/json",
				},
			});
		}))

		async function gatherResponse(response) {
			const { headers } = response;
			const contentType = headers.get('content-type') || '';
			if (contentType.includes('application/json')) {
				return JSON.stringify(await response.json());
			} else if (contentType.includes('application/text')) {
				return response.text();
			} else if (contentType.includes('text/html')) {
				return response.text();
			} else {
				return response.text();
			}
		}
		const results = await Promise.all(responses.map(async response => { gatherResponse(response) }));
		const init = {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		return new Response(results.join(), init);

		/*
		return await fetch('https://slack.com/api/chat.postMessage', {
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

		/*
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

		return await fetch('https://slack.com/api/files.upload', {
			method: "POST",
			body: formData,
			headers: {
				Authorization: `Bearer ${botAccessToken}`,
			},
		});
		*/
	},
};
