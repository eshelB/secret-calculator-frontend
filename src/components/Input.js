import React, { Component } from "react";

export default class Input extends Component {
  render() {
    return (
      <div className="Input">
        <form>
          <label>
            operand {this.props.label}: &emsp;
            <input type="number" min="0" name="numform" onChange={this.props.onchange} value={this.props.value}/>
          </label>
        </form>
      </div>
    );
  }
}