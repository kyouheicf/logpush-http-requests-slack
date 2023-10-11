import { decompressSync } from 'fflate';

export default {
	async fetch(request, env, ctx) {
		const buf = await request.arrayBuffer();

		const PRESHARED_AUTH_HEADER_KEY = 'X-Logpush-Auth';
		const PRESHARED_AUTH_HEADER_VALUE = 'mypresharedkey';

		const psk = request.headers.get(PRESHARED_AUTH_HEADER_KEY);
		//console.log(psk)
		const contentEncoding = request.headers.get('content-encoding')
		console.log(`content-encoding === ${contentEncoding}`)

		if (psk !== PRESHARED_AUTH_HEADER_VALUE) {
			return new Response('Sorry, you have supplied an invalid key.', {
				status: 403,
			});
		}
		// Decompress gzipped logpush body to json
		const compressed = new Uint8Array(buf);
		const enc = new TextDecoder("utf-8");

		//console.log(`compressed = ${compressed}`);
		//console.log(`compressed decode =${enc.decode(compressed)}`);
		//console.log(`compressed decode =${enc.decode(compressed).trim()}`);
		const decompressed = decompressSync(compressed);
		//console.log(`decompressed = ${decompressed}`);
		console.log(`decompressed decode =${enc.decode(decompressed)}`);

		if (enc.decode(decompressed).trim() == '{"content":"test"}') {
			//console.log('aaa')
			var json = '[{"content":"test"}]';
			console.log(`json = ${json}`);
		} else {
			//console.log('bbb')
			var json = '[' + enc.decode(decompressed).trim().replace(/\n/g, ',') + ']';
			console.log(`json = ${json}`);
		}

		const jsonobj = JSON.parse(json);
		//console.log(`jsonobj = ${jsonobj}`);

		const responses = await Promise.all(jsonobj.map(jsonelem => {
			//console.log(jsonelem)
			const jsonfmt = JSON.stringify(jsonelem, null, 2);
			console.log(`jsonfmt = ${jsonfmt}`);

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
			//console.log(`payload === ${JSON.stringify(payload, null, 2)}`)
			const botAccessToken = env.SLACK_BOT_ACCESS_TOKEN;
			//console.log(`botAccessToken === ${botAccessToken}`)
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
		const results = await Promise.all(responses.map(response => { gatherResponse(response) }));
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
