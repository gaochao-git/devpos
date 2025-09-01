import React from 'react';
import { Input, Button, message, Tag, Select, Typography, Icon, Drawer, List, Checkbox, Popover, Pagination, Modal } from 'antd';
import MessageRenderer from './MessageRenderer';
import DatasetManager from './DatasetManager';
const { TextArea } = Input;
const { Text } = Typography;

const SQLAssistantUI = (props) => {
  const {
    // State
    inputValue,
    conversationHistory,
    isStreaming,
    currentStreamingMessage,
    selectedTables,
    allTables,
    showTableSelector,
    searchTableValue,
    streamingId,
    thread_id,
    historicalConversations,
    isHistoryDrawerVisible,
    isLoadingHistory,
    selectedConversation,
    tablePageSize,
    currentTablePage,
    isSearching,
    instance,
    database,
    cluster_name,
    api_url,
    api_key,
    selected_model,
    assistant_id,
    login_user_name,
    agentThoughts,
    showDatasetManager,
    showUnifiedSelector,
    selectedCategory,
    datasets,
    loadingDatasets,
    datasetSearchKeyword,
    selectedDataset,
    useDatasetContext,
    previewDataset,
    showDatasetPreview,
    showSharedDatasets,
    showOwnDatasets,
    streamingComplete,
    isUserBrowsing,
    isUserScrolling,
    
    // Methods
    handleSendMessage,
    handleStopStreaming,
    handleClearHistory,
    handleCopySQL,
    handleApplySQL,
    handleMouseEnterChat,
    handleMouseLeaveChat,
    toggleHistoryDrawer,
    fetchConversationMessages,
    handleTableSelect,
    handleSearchTable,
    handleCategoryChange,
    handleSelectAllTables,
    handleClearAllTables,
    handleTablePageChange,
    handleSelectDataset,
    handlePreviewDataset,
    handleClosePreview,
    handleGoToDatasetManager,
    loadMoreHistory,
    
    // Refs
    inputRef,
    messageRendererRef,
    
    // Props
    setState
  } = props;

  // 获取过滤后的表格
  const filteredTables = allTables.filter(table => 
    table.toLowerCase().includes(searchTableValue.toLowerCase())
  );

  // 检查当前过滤后的表是否全部选中
  const isAllSelected = filteredTables.length > 0 && 
    filteredTables.every(table => selectedTables.includes(table));


  // 修改分页数据的计算逻辑
  const startIndex = (currentTablePage - 1) * tablePageSize;
  const paginatedTables = filteredTables.slice(startIndex, startIndex + tablePageSize);

  // 统一选择器组件
  const unifiedSelector = (
    <div style={{ width: '500px', height: '400px', display: 'flex' }}>
      {/* 左侧分类选择 */}
      <div style={{ 
        width: '120px', 
        backgroundColor: '#f5f5f5', 
        borderRight: '1px solid #d9d9d9',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div 
          style={{
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: selectedCategory === 'tables' ? '#1890ff' : 'transparent',
            color: selectedCategory === 'tables' ? '#fff' : '#333',
            borderBottom: '1px solid #d9d9d9',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px'
          }}
          onClick={() => handleCategoryChange('tables')}
        >
          <Icon type="table" />
          <span>数据表</span>
        </div>
        <div 
          style={{
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: selectedCategory === 'datasets' ? '#1890ff' : 'transparent',
            color: selectedCategory === 'datasets' ? '#fff' : '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px'
          }}
          onClick={() => handleCategoryChange('datasets')}
        >
          <Icon type="database" />
          <span>AI数据集</span>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 搜索框 */}
        <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input.Search
            placeholder={selectedCategory === 'tables' ? '搜索表名' : '搜索数据集'}
            value={selectedCategory === 'tables' ? searchTableValue : datasetSearchKeyword}
            onChange={e => {
              if (selectedCategory === 'tables') {
                handleSearchTable(e.target.value);
              } else {
                setState({ datasetSearchKeyword: e.target.value });
              }
            }}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        {/* 列表内容 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedCategory === 'tables' ? (
            // 表列表
            <>
              <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>已选择 {selectedTables.length} 个表</span>
                  <div>
                    <Button 
                      size="small" 
                      type="link"
                      onClick={handleSelectAllTables}
                      style={{ padding: 0, marginRight: 8 }}
                    >
                      {isAllSelected ? '取消全选' : '全选'}
                    </Button>
                    <Button 
                      size="small" 
                      type="link"
                      onClick={handleClearAllTables}
                      disabled={selectedTables.length === 0}
                      style={{ padding: 0 }}
                    >
                      清空
                    </Button>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <List
                  dataSource={paginatedTables}
                  renderItem={(table) => (
                    <List.Item 
                      style={{ 
                        padding: '6px 8px', 
                        border: 'none',
                        borderRadius: '4px',
                        margin: '2px 0',
                        backgroundColor: selectedTables.includes(table) ? '#e6f7ff' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleTableSelect({ table_name: table })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Icon 
                          type="table" 
                          style={{ 
                            marginRight: '8px', 
                            color: selectedTables.includes(table) ? '#1890ff' : '#8c8c8c' 
                          }} 
                        />
                        <span style={{ 
                          fontSize: '12px',
                          color: selectedTables.includes(table) ? '#1890ff' : '#333'
                        }}>
                          {table}
                        </span>
                        {selectedTables.includes(table) && (
                          <Icon 
                            type="check" 
                            style={{ 
                              marginLeft: 'auto', 
                              color: '#1890ff' 
                            }} 
                          />
                        )}
                      </div>
                    </List.Item>
                  )}
                />
                {filteredTables.length > tablePageSize && (
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <Pagination
                      size="small"
                      current={currentTablePage}
                      pageSize={tablePageSize}
                      total={filteredTables.length}
                      onChange={handleTablePageChange}
                      showSizeChanger={false}
                      simple
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            // 数据集列表
            <>
              <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span>数据集列表</span>
                   <Button 
                     size="small" 
                     type="link"
                     onClick={handleGoToDatasetManager}
                     style={{ padding: 0, fontSize: '12px' }}
                   >
                     管理数据集
                   </Button>
                 </div>
                 
                 {/* 筛选选项 */}
                 <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                   <Checkbox
                     checked={showSharedDatasets}
                     onChange={(e) => setState({ showSharedDatasets: e.target.checked })}
                     style={{ fontSize: '11px' }}
                   >
                     共享数据集
                   </Checkbox>
                   <Checkbox
                     checked={showOwnDatasets}
                     onChange={(e) => setState({ showOwnDatasets: e.target.checked })}
                     style={{ fontSize: '11px' }}
                   >
                     我的数据集
                   </Checkbox>
                 </div>
               </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <List
                  dataSource={(datasets || []).filter(dataset => {
                    // 关键词筛选
                    const keyword = datasetSearchKeyword || '';
                    const matchesKeyword = dataset.dataset_name.toLowerCase().includes(keyword.toLowerCase()) ||
                      (dataset.dataset_description && dataset.dataset_description.toLowerCase().includes(keyword.toLowerCase()));
                    
                    // 类型筛选：根据勾选框状态筛选
                    const isShared = dataset.is_shared === 1;
                    const isOwn = dataset.create_by === login_user_name;
                    const matchesType = (showSharedDatasets && isShared) || (showOwnDatasets && isOwn);
                    
                    return matchesKeyword && matchesType;
                  })}
                  loading={loadingDatasets}
                  renderItem={(dataset) => (
                    <List.Item 
                      style={{ 
                        padding: '6px 8px', 
                        border: 'none',
                        borderRadius: '4px',
                        margin: '2px 0',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        minHeight: '32px'
                      }}
                      onClick={() => handleSelectDataset(dataset)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                        <Icon 
                          type="database" 
                          style={{ 
                            color: '#52c41a',
                            flexShrink: 0
                          }} 
                        />
                        
                        {/* 数据集名称 */}
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          color: '#333',
                          flexShrink: 0,
                          marginRight: '4px'
                        }}>
                          {dataset.dataset_name}
                        </span>
                        
                        {/* 团队共享标签 */}
                        {dataset.is_shared === 1 && (
                          <Tag color="green" size="small" style={{ margin: 0, flexShrink: 0 }}>
                            共享
                          </Tag>
                        )}
                        
                        {/* 描述 */}
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#666',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginRight: '8px'
                        }}>
                          {dataset.dataset_description || '无描述'}
                        </span>
                        
                        {/* 管理员 */}
                        <span style={{ 
                          fontSize: '10px', 
                          color: '#999',
                          flexShrink: 0,
                          marginRight: '8px'
                        }}>
                          {dataset.admin_by}
                        </span>
                        
                        {/* 预览按钮 */}
                        <Button
                          type="link"
                          size="small"
                          icon="eye"
                          onClick={(e) => handlePreviewDataset(dataset, e)}
                          style={{ 
                            padding: '0 4px',
                            color: '#1890ff',
                            flexShrink: 0,
                            height: '20px',
                            minWidth: '20px'
                          }}
                          title="预览数据集内容"
                        />
                      </div>
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无数据集，请先创建数据集' }}
                />
              </div>
            </>
          )}
        </div>

        {/* 底部操作区 */}
        <div style={{ 
          padding: '12px', 
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {selectedCategory === 'tables' 
              ? `已选择 ${selectedTables.length} 个表` 
              : '点击选择数据集'
            }
          </span>
          <Button 
            size="small"
            type="primary"
            disabled={selectedCategory === 'tables' && selectedTables.length === 0}
            onClick={() => setState({ showUnifiedSelector: false })}
          >
            确认
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        marginBottom: '8px', 
        gap: '8px' 
      }}>
        <Button 
          size="small" 
          onClick={toggleHistoryDrawer}
          icon="history"
        >
          历史会话
        </Button>
        <Button 
          size="small" 
          onClick={handleClearHistory}
          icon="plus"
        >
          新建会话
        </Button>
      </div>

      <MessageRenderer
        ref={messageRendererRef}
        conversationHistory={conversationHistory}
        isStreaming={isStreaming}
        currentStreamingMessage={currentStreamingMessage}
        agentThoughts={agentThoughts}
        onCopySQL={handleCopySQL} 
        onApplySQL={handleApplySQL} 
        onMouseEnter={handleMouseEnterChat}
        onMouseLeave={handleMouseLeaveChat}
        isUserBrowsing={isUserBrowsing}
        isUserScrolling={isUserScrolling}
        onScrollToBottom={() => {
          setState({ 
            isUserScrolling: false, 
            isUserBrowsing: false 
          });
        }}
        shouldAutoScroll={!isUserBrowsing && !isUserScrolling}
        onScrollStateChange={(isAtBottom) => {
          if (isAtBottom && isUserScrolling) {
            setState({ isUserScrolling: false });
          }
          else if (!isAtBottom && !isUserBrowsing && !isUserScrolling) {
            setState({ isUserScrolling: true });
          }
        }}
        streamingComplete={streamingComplete}
      />

      <Drawer
        title="历史会话"
        placement="right"
        closable={true}
        onClose={toggleHistoryDrawer}
        visible={isHistoryDrawerVisible}
        width={320}
      >
        <List
          dataSource={historicalConversations}
          loading={isLoadingHistory}
          renderItem={item => (
            <List.Item
              key={item.id}
              onClick={() => fetchConversationMessages(item.id)}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedConversation?.id === item.id ? '#e6f7ff' : 'transparent',
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '4px'
              }}
            >
              <List.Item.Meta
                avatar={<Icon type="message" />}
                title={item.name || '未命名会话'}
                description={new Date(item.created_at * 1000).toLocaleString()}
              />
            </List.Item>
          )}
          loadMore={
            props.hasMoreConversations && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <Button onClick={loadMoreHistory} loading={isLoadingHistory}>
                  加载更多
                </Button>
              </div>
            )
          }
        />
      </Drawer>

      <DatasetManager 
        visible={showDatasetManager}
        onCancel={() => setState({ showDatasetManager: false })}
        instance={instance}
        database={database}
        allTables={allTables}
        clusterName={cluster_name}
        currentUser={login_user_name}
      />

      {/* 数据集预览模态框 */}
      <Modal
        title={`数据集预览: ${previewDataset ? previewDataset.dataset_name : ''}`}
        visible={showDatasetPreview}
        onCancel={handleClosePreview}
        width={800}
        footer={[
          <Button key="close" onClick={handleClosePreview}>
            关闭
          </Button>,
          <Button 
            key="select" 
            type="primary" 
            onClick={() => {
              handleSelectDataset(previewDataset);
              handleClosePreview();
            }}
            disabled={!previewDataset}
          >
            选择此数据集
          </Button>
        ]}
      >
        {previewDataset && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>创建人：</Text>
              <span style={{ marginLeft: '8px', color: '#666' }}>
                {previewDataset.create_by}
              </span>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>管理员：</Text>
              <span style={{ marginLeft: '8px', color: '#666' }}>
                {previewDataset.admin_by}
              </span>
              {previewDataset.is_shared === 1 && (
                <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                  团队共享
                </Tag>
              )}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>描述：</Text>
              <div style={{ marginTop: '4px', color: '#666' }}>
                {previewDataset.dataset_description || '无描述'}
              </div>
            </div>
            <div>
              <Text strong>数据集内容：</Text>
              <div style={{ 
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                maxHeight: '400px',
                overflow: 'auto',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                border: '1px solid #d9d9d9'
              }}>
                {previewDataset.dataset_content}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div style={{
        flexShrink: 0,
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        padding: '8px',
        backgroundColor: '#fff',
        marginTop: 'auto'
      }}>
        <div style={{ 
          marginBottom: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px' 
        }}>
          <Popover
            content={unifiedSelector}
            title="选择数据表或AI数据集"
            trigger="click"
            visible={showUnifiedSelector}
            onVisibleChange={visible => setState({ showUnifiedSelector: visible })}
            placement="topLeft"
            overlayStyle={{ width: '520px' }}
          >
            <Button 
              size="small" 
              icon="plus" 
              style={{ marginRight: '8px', flexShrink: 0 }}
            >
              选择数据表或AI数据集
            </Button>
          </Popover>
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            whiteSpace: 'nowrap', 
            paddingBottom: '4px',
            maxHeight: '64px',
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start'
          }}>
            {useDatasetContext && selectedDataset ? (
              <Tag
                closable
                onClose={() => setState({ 
                  selectedDataset: null, 
                  useDatasetContext: false 
                })}
                style={{ 
                  margin: '2px', 
                  flexShrink: 0, 
                  backgroundColor: '#52c41a', 
                  color: '#fff',
                  border: 'none'
                }}
              >
                <Icon type="database" style={{ marginRight: '4px' }} />
                {selectedDataset.dataset_name}
              </Tag>
            ) : (
              selectedTables.map(table => (
                <Tag
                  key={table}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    handleTableSelect({ table_name: table });
                  }}
                  style={{ margin: '2px', flexShrink: 0 }}
                >
                  <Icon type="table" style={{ marginRight: '4px' }} />
                  {table}
                </Tag>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setState({ inputValue: e.target.value })}
              placeholder="请直接输入您的问题，系统会自动添加数据库和表的上下文信息"
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ 
                border: 'none',
                boxShadow: 'none',
                resize: 'none',
                padding: 0
              }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isStreaming}
            />
          </div>
          
          {isStreaming ? (
            <Button 
              danger
              onClick={handleStopStreaming}
              icon="pause-circle"
              style={{ flexShrink: 0 }}
            >
              停止
            </Button>
          ) : (
            <Button 
              type="primary" 
              onClick={handleSendMessage}
              icon="send"
              style={{ flexShrink: 0 }}
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SQLAssistantUI;