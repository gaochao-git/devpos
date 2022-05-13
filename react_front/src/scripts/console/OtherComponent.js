import React, { Component } from "react";
import { Table } from "semantic-ui-react";
import "semantic-ui-css/semantic.min.css";
class OtherComponent extends Component {
    render() {
        return (
            <div>
                <Table celled>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>
                                懒加载
                            </Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        <Table.Row >
                            <Table.Cell>
                                {this.props.data.name}
                                <br/>
                                {this.props.data.description}
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table>
            </div>
        )
    }
}
export default OtherComponent;