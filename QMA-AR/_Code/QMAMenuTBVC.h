
#import <UIKit/UIKit.h>

@class QMAMenuTBVC;


@protocol QMAMenuTBVCDelegate <NSObject>

- (void)qmaMenuDidTapToClose:(QMAMenuTBVC *)qmaMenu;
- (void)qmaMenuDidTapToViewAboutPage:(QMAMenuTBVC *)qmaMenu;
- (void)qmaMenuDidTapToViewQMA:(QMAMenuTBVC *)qmaMenu;

@end


@interface QMAMenuTBVC : UITableViewController

@property (nonatomic, weak) id <QMAMenuTBVCDelegate> delegate;

@end
