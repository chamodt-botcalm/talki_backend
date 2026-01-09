import {
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Container from './components/Container';
import * as theme from '../constants/theme';
import { Button, EditText, Text } from './components';
import moment from 'moment';
import BottomSheet from './components/BottomSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import constants from '../constants/constants';
import Grid from 'react-native-grid-component';
import useChatViewController from '../view-controllers/useChatViewController';
import { Menu, MenuOption, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';
//import Clipboard from '@react-native-clipboard/clipboard';
import Message from './components/message';
import Checkbox from './components/checkbox';

const ChatScreen = () => {
  const { Popover } = renderers;
  const {
    user,
    themeName,
    message,
    messages,
    reciever,
    scrollRef,
    isKeyboardVisible,
    stickers,
    stickerPacks,
    showAttachment,
    transfer,
    touchedMsg,
    replyText,
    editText,
    showPin,
    pinndedmessages,
    pinViewIndex,
    flashIndex,
    opacity,
    showDelete,
    selectMode,
    selectedItems,
    forwardMode,
    users,
    showPinText,
    setForwardMsg,
    setForwardMode,
    setSelectMode,
    setShowDelete,
    setPinViewItem,
    setShowPin,
    setEdit,
    setReply,
    setMenu,
    resetMenu,
    setTransfer,
    setstickers,
    toChatlist,
    sendTextMessage,
    setMessage,
    selectImage,
    sendSticker,
    setShowAttachment,
    viewUser,
    setPin,
    setPinMsg,
    setDelete,
    setDelMsg,
    select,
    cancelSelection,
    forwardTo
  } = useChatViewController();
  return (
    <Container>
      <SafeAreaView style={styles.header}>
        <View>
          <TouchableOpacity style={styles.row} onPress={toChatlist}>
            <Image source={theme.images.back} style={styles.icon} />
            <Text green>Chats</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.center} onPress={viewUser}>
          <Text white s12 center>
            {reciever.username}
          </Text>
          <Text white s10 center style={styles.ls}>
            Last seen just now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={viewUser}>
          {reciever.image == 'user.png' ? (
            <Image source={theme.images.contacts} style={styles.pic} />
          ) : (
            <Image source={theme.images.sender} style={styles.pic} />
          )}
        </TouchableOpacity>
      </SafeAreaView>
      <BottomSheet
        color={constants.themes[themeName].background}
        bar={true}
        backFunc={toChatlist}
        height={Platform.OS == 'ios' ? theme.height(85) : theme.height(87)}>
        <View style={[styles.bottomContainer, {
          backgroundColor: constants.themes[themeName].background
        }]}>
          {selectMode && (
            <View style={styles.selRow}>
              <TouchableOpacity>
                {/* <Text blue>Clear All</Text> */}
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelSelection}>
                <Text blue>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {pinndedmessages.length > 0 && (
            <View style={styles.pinView}>
              <View style={styles.pinContaier}>
                <View style={styles.pinHandles}>
                  {pinndedmessages.map((e, i) =>
                    <TouchableOpacity key={i} style={styles.pinHandle} onPress={setPinViewItem}></TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.pinTile} onPress={setPinViewItem}>
                  <Text bold blue s12>Pinned Message {pinViewIndex + 1}</Text>
                  <Text lines={1} s12>{pinndedmessages[pinViewIndex].type == 'text' ? pinndedmessages[pinViewIndex].message : pinndedmessages[pinViewIndex].type}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <FlatList
            style={styles.chatlist}
            data={messages}
            ref={it => (scrollRef.current = it)}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item, index }) => (
              <View style={styles.chat}>
                {/* <Text s10 grey center>
                  {moment(item.createdat).format('d MMMM, dddd')}
                </Text> */}
                {/* chat message start */}
                <View style={[styles.chatMessageContainer, { backgroundColor: selectedItems.includes(item._id) ? theme.colors.grey5 : theme.colors.white }]}>
                  {selectMode ? (
                    <Checkbox checked={selectedItems.includes(item._id) ? true : false} onPress={() => select(item._id)} />
                  ) : user._id == item.sender ? (
                    <View></View>
                  ) : null}
                  {selectMode ? (
                    <Message user={user} item={item} flashIndex={flashIndex} opacity={opacity} index={index} reciever={reciever} themeName={themeName} />
                  ) : (
                    <Menu
                      onOpen={() => setMenu(item?._id, index)}
                      onClose={() => resetMenu()}
                      style={user._id == item.sender ? styles.chatMenuR : styles.chatMenuL}
                      renderer={Popover}
                      rendererProps={{ preferredPlacement: 'bottom' }}
                    >
                      <MenuTrigger
                        triggerOnLongPress={true}
                        customStyles={{
                          TriggerTouchableComponent: TouchableWithoutFeedback
                        }}
                      >
                        <Message user={user} item={item} flashIndex={flashIndex} opacity={opacity} index={index} reciever={reciever} themeName={themeName} />
                      </MenuTrigger>

                      {/* popupmenu start */}
                      <MenuOptions customStyles={{
                        optionsWrapper: styles.menu,
                        optionsContainer: styles.menu
                      }}>
                        {user._id == item.sender && item?.seen == true && (
                          <>
                            <View style={styles.menuOption}>
                              <View style={styles.row}>
                                <Image source={theme.images.dcheck} style={styles.iconSmall} />
                                <Text s12>Read {moment(item?.seenat).format("MMM DD")} at {moment(item?.seenat).format("h:mm a")}</Text>
                              </View>
                            </View>
                            <View style={styles.menuline}></View>
                            <View style={styles.menuline}></View>
                            <View style={styles.menuline}></View>
                          </>
                        )}
                        <MenuOption onSelect={() => setReply(item)} style={styles.menuOption}>
                          <Text s13>Reply</Text>
                          <Image source={theme.images.reply} style={styles.iconSmall} />
                        </MenuOption>
                        <View style={styles.menuline}></View>
                        {item?.type == 'text' && (
                          <>
                            <MenuOption onSelect={() => {/*Clipboard.setString(item?.message)*/}} style={styles.menuOption}>
                              <Text s13>Copy</Text>
                              <Image source={theme.images.copy} style={styles.iconSmall} />
                            </MenuOption>
                            <View style={styles.menuline}></View>
                          </>
                        )}
                        {item?.type == 'text' && item?.sender == user._id && (
                          <MenuOption onSelect={() => setEdit(item)} style={styles.menuOption}>
                            <Text s13>Edit</Text>
                            <Image source={theme.images.reply} style={styles.iconSmall} />
                          </MenuOption>
                        )}
                        <View style={styles.menuline}></View>
                        <MenuOption onSelect={() => setPinMsg(item)} style={styles.menuOption}>
                          <Text s13>{((user._id == item.sender && item.senderPinned) || (user._id == item.reciever && item.recieverPinned)) ? 'Unpin' : 'Pin'}</Text>
                          <Image source={((user._id == item.sender && item.senderPinned) || (user._id == item.reciever && item.recieverPinned)) ? theme.images.unpinm : theme.images.pinm} style={styles.iconSmall} />
                        </MenuOption>
                        <View style={styles.menuline}></View>
                        <MenuOption onSelect={() => setForwardMsg(item)} style={styles.menuOption}>
                          <Text s13>Forward</Text>
                          <Image source={theme.images.forward} style={styles.iconSmall} />
                        </MenuOption>
                        <View style={styles.menuline}></View>
                        <MenuOption onSelect={() => setDelMsg(item)} style={styles.menuOption}>
                          <Text s13>Delete</Text>
                          <Image source={theme.images.deletec} style={styles.iconSmall} />
                        </MenuOption>
                        <View style={styles.menuline}></View>
                        <View style={styles.menuline}></View>
                        <View style={styles.menuline}></View>
                        <MenuOption onSelect={() => setSelectMode(true)} style={styles.menuOption}>
                          <Text s13>Select</Text>
                          <Image source={theme.images.select} style={styles.iconSmall} />
                        </MenuOption>
                      </MenuOptions>
                      {/* popupmenu end */}
                    </Menu>
                  )}
                </View>
                {/* chat message start */}
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
          />

          {selectMode ? (
            <>
              {selectedItems.length > 0 && (
                <View style={styles.selOptions}>
                  <TouchableOpacity onPress={() => setShowDelete(true)}>
                    <Image source={theme.images.delete} style={styles.icon} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setForwardMode(true)}>
                    <Image source={theme.images.forward} style={styles.iconSmall} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.chatbox,
                {
                  paddingBottom: isKeyboardVisible
                    ? Platform.OS == 'ios'
                      ? theme.height(17)
                      : theme.height(14)
                    : theme.height(3),
                },
              ]}>
              {stickers && (
                <View style={styles.stickers}>
                  <FlatList
                    data={stickerPacks}
                    renderItem={({ item }) => (
                      <View key={item._id}>
                        <Text grey s10>
                          {item?.packname}
                        </Text>
                        <Grid
                          style={styles.list}
                          renderItem={(data, i) => (
                            <TouchableOpacity
                              key={i}
                              onPress={() => sendSticker(data?.icon)}>
                              <Image
                                source={{
                                  uri: `${constants.server}/public/stickers/${data?.icon}`,
                                }}
                                style={styles.sticker}
                              />
                            </TouchableOpacity>
                          )}
                          data={item?.stickers}
                          numColumns={6}
                        />
                      </View>
                    )}
                  />
                </View>
              )}
              <View style={styles.inputContainer}>
                {Object.keys(replyText).length > 0 && (
                  <View style={styles.replyHightlight}>
                    <View>
                      <Text s13 semiBold blue>Reply to {reciever.username}</Text>
                      {replyText?.type == 'text' && (
                        <Text s13 lines={1}>{replyText?.message}</Text>
                      )}
                      {replyText?.type == 'sticker' && (
                        <Image
                          source={{
                            uri: `${constants.server}/public/stickers/${replyText?.message}`,
                          }}
                          style={styles.replyImg}
                        />
                      )}
                      {replyText?.type == 'image' && (
                        <Image
                          source={{
                            uri: `${constants.server}/uploads/${replyText.message}`,
                          }}
                          style={styles.sticker}
                        />
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setReply({})}>
                      <Image source={theme.images.close} style={styles.icon} />
                    </TouchableOpacity>
                  </View>
                )}

                {Object.keys(editText).length > 0 && (
                  <View style={styles.replyHightlight}>
                    <View>
                      <Text s13 semiBold blue>Edit Message</Text>
                      {editText?.type == 'text' && (
                        <Text s13 lines={1}>{editText?.message}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setEdit({})}>
                      <Image source={theme.images.close} style={styles.icon} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.chatInput}>
                  <TouchableOpacity onPress={() => setShowAttachment(!showAttachment)}>
                    <Image source={theme.images.clip} style={styles.icon} />
                  </TouchableOpacity>

                  <EditText
                    placeholder="Message"
                    suffix
                    suffiximage={theme.images.sticker}
                    onChangeText={setMessage}
                    value={message}
                    handleEnterPress={() => sendTextMessage()}
                    suffixPress={() => setstickers(!stickers)}
                  />
                  <Image source={theme.images.mic} style={styles.icon} />
                </View>
              </View>
              {showAttachment && (
                <View style={styles.attchCont}>
                  <View style={styles.attchRow}>
                    <TouchableOpacity style={styles.attchTile} onPress={selectImage}>
                      <Image
                        source={theme.images.gallery}
                        style={styles.attchIcon}
                      />
                      <Text s10>Gallery</Text>
                    </TouchableOpacity>
                    <View style={styles.attchTile}>
                      <Image
                        source={theme.images.document}
                        style={styles.attchIcon}
                      />
                      <Text s10>Document</Text>
                    </View>
                    <View style={styles.attchTile}>
                      <Image
                        source={theme.images.audio}
                        style={styles.attchIcon}
                      />
                      <Text s10>Audio</Text>
                    </View>
                  </View>
                  <View style={styles.attchRow}>
                    <View style={styles.attchTile}>
                      <Image
                        source={theme.images.locationpin}
                        style={styles.attchIcon}
                      />
                      <Text s10>Location</Text>
                    </View>
                    <View style={styles.attchTile}>
                      <Image
                        source={theme.images.contact}
                        style={styles.attchIcon}
                      />
                      <Text s10>Contact</Text>
                    </View>
                    <View style={styles.attchTile}>
                      <Image
                        source={theme.images.poll}
                        style={styles.attchIcon}
                      />
                      <Text s10>Poll</Text>
                    </View>
                  </View>
                  <View style={styles.attchRow}>
                    <TouchableOpacity style={styles.attchTile} onPress={() => setTransfer(true)}>
                      <Image
                        source={theme.images.transfer}
                        style={styles.attchIcon}
                      />
                      <Text s10>Transfer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </BottomSheet>
      {transfer && (
        <View style={styles.overlay}>
          <BottomSheet
            bar={true}
            backFunc={() => setTransfer(false)}
            height={Platform.OS == 'ios' ? theme.height(30) : theme.height(33)}>
            <View style={styles.transferSheet}>
              <View style={styles.balance}>
                <Text>Balance <Text s12>(0.000012)</Text></Text>
                <Text s10>$12.26514</Text>
              </View>
              <View style={styles.amountInput}>
                <TextInput placeholder='amount' style={styles.amount} />
                <Text>|</Text>
                <View style={styles.row}>
                  <Image
                    source={theme.images.ticoin}
                    style={styles.coin}
                  />
                  <Text s12>Talkie</Text>
                  <Image
                    source={theme.images.down}
                    style={styles.down}
                  />
                </View>
              </View>
              <Button text="Transfer" onPress={() => { }} />
            </View>
          </BottomSheet>
        </View>
      )}
      {forwardMode && (
        <View style={styles.overlay}>
          <BottomSheet
            back
            backFunc={() => setForwardMode(false)}
            height={Platform.OS == 'ios' ? theme.height(85) : theme.height(88)}>
            {users.map((e, i) => (
              <TouchableOpacity onPress={() => forwardTo(e)} key={i}>
                <View style={styles.callTile}>
                  <View style={styles.row}>
                    <Image source={theme.images.you} style={styles.pic} />
                    <View>
                      <Text>{e?.username}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.line2}></View>
              </TouchableOpacity>
            ))}
          </BottomSheet>
        </View>
      )}
      {(showPin || showDelete) && (
        <View style={styles.modalView}>

        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPin}
        onRequestClose={() => setShowPin(false)}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPin(false)}>

        </TouchableOpacity>
        <View style={styles.pinModal}>
          <TouchableOpacity style={styles.modalTab} onPress={() => setPin(1)}>
            <Text red>{showPinText} for both</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalTab} onPress={() => setPin(2)}>
            <Text red>{showPinText} for me</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showDelete}
        onRequestClose={() => setShowDelete(false)}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDelete(false)}>

        </TouchableOpacity>
        <View style={styles.pinModal}>
          <TouchableOpacity style={styles.modalTab} onPress={() => setDelete(1)}>
            <Text red>Delete for both</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalTab} onPress={() => setDelete(2)}>
            <Text red>Delete for me</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Container>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: theme.width(60),
    height: theme.height(20),
    resizeMode: 'contain',
    position: 'absolute',
    alignSelf: 'center',
    top: theme.height(14),
    zIndex: 2,
  },
  bg: {
    width: theme.width(65),
    height: theme.height(70),
    resizeMode: 'contain',
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  bottomContainer: {
    alignItems: 'center',
  },
  statusBar: {
    width: theme.width(95),
    height: theme.height(10),
    alignSelf: 'center',
    position: 'absolute',
    bottom: theme.height(75),
    gap: theme.width(2.5),
    flexDirection: 'row',
  },
  status: {
    width: theme.height(7.5),
    height: theme.height(10),
    alignItems: 'center',
  },
  scroll: {
    marginHorizontal: theme.width(2.5),
  },
  statusImage: {
    width: theme.height(7.5),
    height: theme.height(7.5),
    resizeMode: 'contain',
  },
  statusImage2: {
    width: theme.height(7.5),
    height: theme.height(7.5),
    resizeMode: 'contain',
    borderColor: theme.colors.green,
    borderWidth: theme.height(0.25),
    borderRadius: theme.height(7.5),
  },
  statusImage3: {
    width: theme.height(7.5),
    height: theme.height(7.5),
    resizeMode: 'contain',
    borderColor: theme.colors.green + '50',
    borderWidth: theme.height(0.25),
    borderRadius: theme.height(7.5),
  },
  pic: {
    width: theme.height(3),
    height: theme.height(3),
    resizeMode: 'contain',
    borderColor: theme.colors.green + '50',
    borderWidth: theme.height(0.25),
    borderRadius: theme.height(7.5),
  },
  plus: {
    width: theme.height(1.5),
    height: theme.height(1.5),
    resizeMode: 'contain',
  },
  icon: {
    width: theme.height(2.5),
    height: theme.height(2.5),
    resizeMode: 'contain',
  },
  iconr: {
    width: theme.height(2.5),
    height: theme.height(2.5),
    resizeMode: 'contain',
    alignSelf: 'flex-end',
  },
  plusBtn: {
    width: theme.height(2.5),
    height: theme.height(2.5),
    backgroundColor: theme.colors.white,
    borderRadius: theme.height(2.5),
    borderColor: theme.colors.black2,
    borderWidth: theme.height(0.2),
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: theme.height(86),
    gap: theme.width(2),
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingEnd: theme.width(2.5),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.width(2),
  },
  line: {
    borderColor: theme.colors.grey,
    borderWidth: theme.height(0.1),
    width: theme.width(72),
    alignSelf: 'flex-end',
    marginEnd: theme.width(5),
  },
  rp: {
    alignSelf: 'flex-start',
  },
  header: {
    width: theme.width(95),
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ls: {
    opacity: 0.3,
  },
  center: {
    alignSelf: 'center',
    alignItems: 'center',
    marginLeft: -theme.width(12),
  },
  chatbox: {
    backgroundColor: theme.colors.grey4,
    width: theme.width(100),
    paddingBottom: theme.height(3),
  },
  inputContainer: {
    alignItems: 'center',
  },
  chatInput: {
    marginTop: theme.height(1.3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: theme.width(92),
  },
  replyHightlight: {
    marginTop: theme.height(1.3),
    padding: theme.height(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: theme.width(95),
    borderLeftColor: theme.colors.blue2,
    borderLeftWidth: theme.height(0.4),
    borderRadius: theme.height(0.1),
  },
  chatlist: {
    paddingTop: theme.height(1),
  },
  stickers: {
    height: theme.height(30),
  },
  row2: {
    flexDirection: 'row',
  },
  sticker: {
    width: theme.width(15),
    height: theme.width(15),
    resizeMode: 'contain',
  },
  replyImg: {
    width: theme.width(10),
    height: theme.width(10),
    resizeMode: 'contain',
  },
  stickerGrid: {
    flexWrap: 'wrap',
  },
  list: {
    flex: 1,
  },
  coin: {
    width: theme.width(5),
    height: theme.width(5),
    resizeMode: 'contain',
  },
  down: {
    width: theme.width(3.5),
    height: theme.width(3.5),
    resizeMode: 'contain',
  },
  attchIcon: {
    width: theme.width(11),
    height: theme.width(11),
    resizeMode: 'contain',
  },
  attchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: theme.width(60)
  },
  attchCont: {
    padding: theme.height(4),
    gap: theme.height(2),
  },
  attchTile: {
    alignItems: 'center',
    alignContent: 'center'
  },
  overlay: {
    width: theme.width(100),
    height: theme.height(100),
    backgroundColor: theme.colors.black + '80',
    position: 'absolute',
  },
  transferSheet: {
    width: theme.width(100),
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.height(3.5),
    borderTopEndRadius: theme.height(3.5),
    alignItems: 'center',
    gap: theme.height(2),
  },
  balance: {
    alignItems: 'center',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    width: theme.width(85),
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.grey2,
    borderWidth: theme.height(0.05),
    borderRadius: theme.height(5),
    height: theme.height(4),
    gap: theme.width(1),
    paddingHorizontal: theme.width(4),
  },
  amount: {
    flex: 1
  },
  chat: {
    width: theme.width(100),
  },
  chatMenuR: {
    width: theme.width(70),
    alignSelf: 'flex-end',
  },
  chatMenuL: {
    width: theme.width(70),
    alignSelf: 'flex-start',
  },
  menu: {
    borderRadius: theme.height(1),
  },
  menuline: {
    borderColor: theme.colors.grey,
    borderWidth: theme.height(0.1),
    width: theme.width(60),
  },
  menuOption: {
    width: theme.width(60),
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingVertical: theme.height(0.7),
    paddingHorizontal: theme.height(2),
  },
  iconSmall: {
    width: theme.height(1.7),
    height: theme.height(1.7),
    resizeMode: 'contain',
  },
  modalView: {
    backgroundColor: theme.colors.black + '50',
    height: theme.height(100),
    width: theme.width(100),
    flex: 1,
    position: 'absolute',
  },
  pinModal: {
    backgroundColor: theme.colors.white,
    width: theme.width(100),
    height: theme.height(15),
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    borderTopLeftRadius: theme.height(5),
    borderTopRightRadius: theme.height(5),
    padding: theme.height(3),
  },
  modalTab: {
    width: theme.width(100),
    height: theme.height(5),
    alignItems: 'center',
    justifyContent: 'center'
  },
  modaltext: {
    paddingTop: theme.height(3),
    paddingBottom: theme.height(1.5),
  },
  pinView: {
    height: theme.height(6),
    width: theme.width(100),
  },
  pinContaier: {
    alignSelf: 'center',
    width: theme.width(92),
    height: theme.height(6),
    gap: theme.height(0.4),
    flexDirection: 'row'
  },
  pinHandles: {
    gap: theme.height(0.4),
  },
  pinHandle: {
    borderLeftColor: theme.colors.blue2,
    borderLeftWidth: theme.height(0.4),
    width: theme.height(0.4),
    flex: 1,
    borderRadius: theme.height(0.4),
    opacity: 0.4,
  },
  pinTile: {
    flex: 1,
    padding: theme.height(0.8),
  },
  chatMessageContainer: {
    width: theme.width(100),
    padding: theme.height(1),
    paddingHorizontal: theme.height(2),
    alignSelf: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: theme.width(6),
    paddingBottom: theme.height(3),
  },
  selRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: theme.width(92),
    justifyContent: 'space-between',
    alignSelf: 'center',
    paddingBottom: theme.height(1.5),
  },
  selOptions: {
    backgroundColor: theme.colors.grey4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: theme.width(100),
    padding: theme.height(2.5),
  },
  users: {
    width: theme.width(94),
  },
  callTile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: theme.width(95),
    height: theme.tabletmode ? theme.height(4) : theme.height(4.5),
    paddingHorizontal: theme.width(1.5),
    paddingStart: theme.width(5),
  },
  line2: {
    borderBottomColor: theme.colors.grey2,
    borderBottomWidth: theme.height(0.05),
    width: theme.width(87),
    height: theme.height(0.5),
    marginStart: theme.width(5),
  },
});

export default ChatScreen;
