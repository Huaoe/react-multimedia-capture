import React, { Component } from 'react';

if(location.protocol !== 'https:' && location.hostname !== 'localhost') {
	console.warn('getUserMedia() must be run from a secure origin: https or localhost.\nChanging protocol to https.');
}
if(!navigator.mediaDevices && !navigator.getUserMedia) {
	console.warn(`Your browser doesn't support navigator.mediaDevices.getUserMedia and navigator.getUserMedia.`);
}

navigator.getUserMedia = navigator.getUserMedia ||
						 navigator.webkitGetUserMedia ||
						 navigator.mozGetUserMedia ||
						 navigator.msGetUserMedia;

class ReactMediaRecorder extends Component {
	constructor(props) {
		super(props);

		this.state = {
			asked: false,
			permission: false,
			available: false,
			recording: false,
			paused: false
		};

		this.stream = null;
		this.mediaRecorder = null;
		this.mediaChunk = [];

		this.start = this.start.bind(this);
		this.stop = this.stop.bind(this);
		this.pause = this.pause.bind(this);
		this.resume = this.resume.bind(this);
		this.initMediaRecorder = this.initMediaRecorder.bind(this);
	}
	componentDidMount() {
		let width = this.props.width;
		let height = this.props.height;
		let constraints = this.props.constraints;

		const handleSuccess = (stream) => {
			this.stream = stream;
			this.mediaChunk = [];

			this.setState({ 
				permission: true, 
				asked: true, 
				recording: false,
			});
			this.props.onGranted();

			this.initMediaRecorder();
		};
		const handleFailed = (err) => {
			this.setState({ asked: false });
			this.props.onDenied(err);
		};

		if(navigator.mediaDevices) {
			navigator.mediaDevices.getUserMedia(constraints)
			.then(handleSuccess)
			.catch(handleFailed);
		}
		else if(navigator.getUserMedia) {
			navigator.getUserMedia(constraints, handleSuccess, handleFailed);
		}
		else {
			let errMessage = `Browser doesn't support UserMedia API. Please try with another browser.`;
			console.warn(errMessage);

			this.props.onError(new Error(errMessage));
		}
	}
	componentWillUnmount() {
		this.stream = null;
		this.mediaRecorder = null;
		this.mediaChunk = [];
	}
	initMediaRecorder() {
		try {
			let options = {};
			let types = ['video/webm;codecs=vp8', 'video/webm', ''];

			if(this.props.mimeType) types.unshift(this.props.mimeType);

			for(let i = 0; i < types.length; i++) {
				let type = types[i];

				if(MediaRecorder.isTypeSupported(type)) {
					options.mimeType = type;
					break;
				}

				console.warn(`${type} is not supported on your browser.`);
			}

			let mediaRecorder = new MediaRecorder(this.stream, options);

			mediaRecorder.ondataavailable = (ev) => {
				if(ev.data && ev.data.size > 0) {
					this.mediaChunk.push(event.data);
				}
			};

			this.mediaRecorder = mediaRecorder;

			this.setState({
				available: true
			});
		}
		catch(err) {
			console.log(err);
			console.error('Failed to initialize MediaRecorder.', err);

			this.setState({
				available: false
			});
		}
	}
	start() {
		if(!this.state.available) return;

		this.mediaChunk = [];
		this.mediaRecorder.start(this.props.timeSlice);

		this.setState({
			recording: true
		});

		this.props.onStart(this.stream);
	}
	pause() {
		if(!this.state.recording) return;
		this.mediaRecorder.stop();

		this.setState({ paused: true });

		this.props.onPause();
	}
	resume() {
		if(!this.state.recording) return;
		this.initMediaRecorder();
		this.mediaRecorder.start(this.props.timeSlice);

		this.setState({ paused: false });

		this.props.onResume(this.stream);
	}
	stop() {
		if(!this.state.available) return;
		
		this.mediaRecorder.stop();

		this.setState({
			recording: false
		});

		let blob = new Blob(this.mediaChunk, { type: 'video/webm' });
		this.props.onStop(blob);
	}
	render() {
		const asked = this.state.asked;
		const permission = this.state.permission;
		const recording = this.state.recording;
		const available = this.state.available;

		return (
			<div className={this.props.className}>
				{this.props.render({
					start: this.start,
					stop: this.stop,
					pause: this.pause,
					resume: this.resume
				})}
			</div>
		);
	}
}
ReactMediaRecorder.propTypes = {
	constraints: React.PropTypes.object,
	className: React.PropTypes.string,
	timeSlice: React.PropTypes.number,
	mimeType: React.PropTypes.string,
	render: React.PropTypes.func,
	onGranted: React.PropTypes.func,
	onDenied: React.PropTypes.func,
	onStart: React.PropTypes.func,
	onStop: React.PropTypes.func,
	onPause: React.PropTypes.func,
	onResume: React.PropTypes.func,
	onError: React.PropTypes.func
};
ReactMediaRecorder.defaultProps = {
	constraints: {
		audio: true,
		video: true
	},
	className: '',
	timeSlice: 0,
	mimeType: '',
	render: function() {},
	onGranted: function(){},
	onDenied: function(){},
	onStart: function(){},
	onStop: function(){},
	onPause: function(){},
	onResume: function(){},
	onError: function(){}
};

export default ReactMediaRecorder;