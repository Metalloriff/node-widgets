import React from "react";
import "./Modals.scss";
import ErrorBoundary from "./ErrorBoundary";
import Toasts from "./Toasts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import InlineLoading from "./InlineLoading";
import { getRandomKey } from "../Classes/Constants";

let openModal;
let closeModal;
let copyToClipboard;
let openImageModal;
let openBoolModal;
let openStringModal;

let onCloseEvents = [];

class Modals extends React.Component {
	state = { active: false, locked: false, modals: [], closing: [] };

	componentDidMount() {
		openModal = async modal => {
			while (this.state.locked)
				await new Promise(r => setImmediate(r));
			await new Promise(r => setImmediate(r)); // javascript is shit
			
			const modals = this.state.modals;
			const id = modals.push(modal);
			this.setState({ modals, active: true });
			
			return id;
		};

		closeModal = () => {
			if (this.state.modals.length > 0) {
				const modals = [...this.state.modals];
				const modal = this.state.modals[modals.length - 1];
				const closing = [...this.state.closing];

				modals.pop(modal);
				closing.push(modal);
	
				if (this.state.active) {
					this.setState({ active: modals.length > 0, locked: true, closing });
					setTimeout(() => {
						this.state.closing.pop(modal);
						this.setState({ modals, locked: false });
					}, 300);
				}
				
				for (let event of onCloseEvents) {
					event();
				}
				
				onCloseEvents = [];
			}
		};

		copyToClipboard = text => {
			try {
				window.navigator.clipboard.writeText(text);

				Toasts.showToast(<span><b>{text.length >= 100 ? text.substr(0, 100) + "..." : text}</b> copied to clipboard</span>, "Success");
			}
			catch (e) {
				openStringModal({
					title: "Failed To Copy",
					description: "Your browser does not support copying to clipboard, you can manually copy here.",
					value: text
				});
			}
		};

		openImageModal = (url, getSources) => {
			const ImageModal = () => {
				const ref = React.useRef();
				const sources = typeof(getSources) === "function" ? getSources() : null;
				
				const Arrows = ({ img }) => {
					const [index, setIndex] = React.useState(-1);
					
					React.useEffect(() => {
						setTimeout(() => {
							if (img.current) {
								setIndex(sources.indexOf(img.current.src));
							}
						}, 500);
					});
					
					const nav = (e, dir) => {
						img.current.src = sources[index + dir];
						setIndex(index + dir);
						
						e.preventDefault();
						e.stopPropagation();
					};
					
					return index === -1 ? null : (
						<div className="ArrowsContainer">
							{ index > 0 ? (
								<div className="Arrow Left" onClick={e => nav(e, -1)}>
									<FontAwesomeIcon className="Icon" icon={faChevronLeft}/>
								</div>
							) : null }
							
							{ index < sources.length - 1 ? (
								<div className="Arrow Right" onClick={e => nav(e, 1)}>
									<FontAwesomeIcon className="Icon" icon={faChevronRight}/>
								</div>
							) : null }
						</div>
					);
				};
				
				return (
					<div className="ImageModal" onClick={() => closeModal()}>
						<img ref={ref} src={url} alt="Image failed to load."/>
						
						{ sources?.length ? <Arrows img={ref}/> : null }
					</div>
				);
			};
			
			openModal(<ImageModal/>);
		}
		
		openBoolModal = async options => {
			const { title = "", description = "", yesText = "Yes", noText = "No", yesColor = "#ff6666", noColor = "" } = options;
			
			const response = await new Promise(resolve => {
				openModal(
					<div className="BoolModal PrimaryBg">
						<div className="Title" dangerouslySetInnerHTML={{ __html: title }}/>
						<div className="Description" dangerouslySetInnerHTML={{ __html: description }}/>

						<div className="Footer">
							<div className="Button TertiaryBg" onClick={() => resolve(false)} style={{ backgroundColor: noColor }}>{noText}</div>
							<div className="Button TertiaryBg" onClick={() => resolve(true)} style={{ backgroundColor: yesColor }}>{yesText}</div>
						</div>
					</div>
				);
			});
			
			closeModal();
			
			return response;
		};
		
		openStringModal = async options => {
			const { rich = false, async = false } = options;
			const { id } = getRandomKey();

			const response = await new Promise(resolve => {
				openModal(
					<StringModal resolve={resolve} {...options} id={id}/>
				);
			});

			!async && closeModal();

			return response;
		}
	}
	
	handleBackdropClick(e) {
		if (!["Modal", "ModalContainer"].some(cn => e.target.classList.contains(cn))) return;
		const { modals } = this.state;
		
		(modals[modals.length - 1].props?.onBackdropClick ?? closeModal)();
	}

	render() {
		return (
			<ErrorBoundary>
				<div className={"ModalContainer" + (this.state.active ? " Active" : "")}
					 onMouseDown={this.handleBackdropClick.bind(this)}>
					{ this.state.modals.map(modal => (
						<div key={this.state.modals.indexOf(modal)} className={"Modal" + (this.state.closing.includes(modal) ||
						(this.state.modals.indexOf(modal) < (this.state.modals.length - 1) && this.state.closing.length === 0) ? " Closing" : "")}
							 style={{ zIndex: this.state.modals.indexOf(modal) * 10 }}>
							<ErrorBoundary>
								{ modal }
							</ErrorBoundary>
						</div>
					)) }
				</div>
			</ErrorBoundary>
		);
	}
}

export function StringModal(props) {
	const { title = "", description = "", yesText = "Confirm", noText = "Cancel", yesColor = "", noColor = "", value = "", onChange = null, rich = false, resolve, id } = props;
	const [no, setNoState] = React.useState(false);
	const [yes, setYesState] = React.useState(false);
	
	return (
		<div className="StringModal PrimaryBg">
			<div className="Title" dangerouslySetInnerHTML={{ __html: title }}/>
			<div className="Description" dangerouslySetInnerHTML={{ __html: description }}/>

			<input id={id} className="Field TertiaryBg" defaultValue={value} onChange={onChange}/>

			<div className="Footer">
				<div className="Button TertiaryBg" onClick={() => (resolve(null), setNoState(true))} style={{ backgroundColor: noColor }}>{ no ? <InlineLoading/> : noText }</div>
				<div className="Button TertiaryBg" onClick={() => (resolve(document.getElementById(id).value), setYesState(true))} style={{ backgroundColor: yesColor }}>{ yes ? <InlineLoading/> : yesText }</div>
			</div>
		</div>
	);
}

export { Modals, openModal, closeModal, copyToClipboard, openImageModal, openBoolModal, openStringModal };